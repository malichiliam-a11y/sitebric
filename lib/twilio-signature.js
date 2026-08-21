import crypto from "node:crypto";

// Proves a request to /api/voice/* actually came from Twilio.
//
// These endpoints are public URLs that answer phone calls, write call
// records, and spend money on model calls. Without this check, anyone who
// learns the URL can forge an entire conversation into a customer's
// dashboard, or simply loop requests at it until the API balance is gone.
// It is the single most important line of code in the receptionist.
//
// The algorithm is Twilio's, and it is short enough to implement here
// rather than pull in their SDK for: take the full request URL, append
// every POST parameter as key then value, sorted by key, then HMAC-SHA1
// the result with the account auth token and base64 it.
//
// Rolling your own crypto is normally the wrong instinct, so this is
// checked against the worked example in Twilio's own security
// documentation — see test/twilio-signature.mjs. If that vector ever
// stops matching, this file is wrong, not the test.

/**
 * @param {string} authToken  the Twilio account auth token
 * @param {string} url        the full URL Twilio requested, exactly as configured
 * @param {object} params     the POST body parameters
 */
export function expectedSignature(authToken, url, params = {}) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + (params[key] ?? ""), url);

  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

/**
 * True when the signature header matches. Compared in constant time —
 * a plain === leaks how much of the signature was right, one byte at a
 * time, which is enough to forge one given enough attempts.
 */
function matches(expected, signature) {
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // signal, so the lengths are compared first and the result is the same
  // either way.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * The URL variants Twilio's own validator accepts.
 *
 * Twilio signs the URL as IT built it, which is not always byte-identical
 * to the URL that arrives. Their library checks four forms rather than
 * one, and so must this — a single-variant check rejected the first real
 * call this product ever took.
 *
 * Two things differ in practice:
 *
 *   The port. Twilio may or may not include :443, and rebuilding the URL
 *   can add or drop it.
 *
 *   The query encoding. This is the one that bites on GET, where every
 *   call parameter travels in the query string: a space may arrive as
 *   "+" or as "%20" depending on who encoded it, and the two hash
 *   differently. Twilio sends FromCity, CallerName and SpeechResult —
 *   all of which routinely contain spaces.
 */
// Exported for the rejection diagnostic in lib/voice-request.js, which
// logs which forms were tried. Not part of the validation contract.
export function urlVariants(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return [url];
  }

  // Built by hand rather than through the URL API, which is the whole
  // trick: assigning port = "443" on an https URL is a no-op, because 443
  // is the default and the URL object drops it. Any form that includes
  // the standard port can therefore only exist as a string — and once it
  // is a string, parsing it again to change something else silently
  // throws the port away.
  const withStandardPort = (u) => {
    const port = u.protocol === "https:" ? ":443" : ":80";
    let out = u.protocol ? `${u.protocol}//` : "";
    out += u.username;
    out += u.password ? `:${u.password}` : "";
    out += u.username || u.password ? "@" : "";
    out += u.host ? u.host + port : "";
    out += u.pathname + u.search + u.hash;
    return out;
  };

  // The hosts this may legitimately have been signed as: the one we were
  // configured with, and its www/apex counterpart.
  //
  // sitebric.com redirects to www.sitebric.com. Twilio requests the URL
  // the number was configured with, follows the redirect, and signs the
  // URL it actually lands on — while PUBLIC_BASE_URL hands us the other
  // one. Same site, different string, every signature failed. That is
  // what killed the third real call this product took; the ErrorUrl on
  // Twilio's fallback request named www.sitebric.com in plain sight.
  //
  // Bounded deliberately: this host always comes from PUBLIC_BASE_URL,
  // which is configuration, never from the request. It toggles exactly
  // one label on a host we already trust, and adds no other host.
  const hosts = [parsed.hostname];
  hosts.push(
    parsed.hostname.startsWith("www.") ? parsed.hostname.slice(4) : `www.${parsed.hostname}`
  );

  // Query re-encodings. This is the one that matters on GET, where every
  // call parameter travels in the query string: URLSearchParams writes a
  // space as "+", Node's querystring — which Twilio's own validator
  // re-serialises with — writes "%20", and the two hash differently.
  // Twilio sends FromCity, CallerName and SpeechResult, all of which
  // routinely contain spaces.
  const searches = [parsed.search];
  if (parsed.search) {
    const plus = new URLSearchParams(parsed.search.slice(1)).toString();
    searches.push(`?${plus}`, `?${plus.replace(/\+/g, "%20")}`);
  }

  // Host, port and encoding vary independently, so they are combined
  // rather than layered — layering them meant rebuilding a string that
  // already carried a port, and losing it again.
  const out = [];
  for (const hostname of new Set(hosts)) {
    for (const search of new Set(searches)) {
      const u = new URL(parsed.toString());
      u.hostname = hostname;
      u.search = "";
      const withoutSearch = u.toString().replace(/\?$/, "");
      out.push(`${withoutSearch}${search}`);

      const ported = new URL(u.toString());
      out.push(`${withStandardPort(ported).replace(/\?$/, "")}${search}`);
    }
  }
  return [...new Set(out)];
}

/**
 * True when the signature header matches any accepted form of the URL.
 * Compared in constant time — a plain === leaks how much of the signature
 * was right, one byte at a time, which is enough to forge one given
 * enough attempts.
 */
export function isValidTwilioRequest({ authToken, url, params, signature }) {
  if (!authToken || !signature || typeof signature !== "string") return false;

  // Every variant is checked even after one matches. Returning early
  // would make the reply time depend on which form was correct, and
  // constant-time comparison is pointless if the loop around it leaks.
  let ok = false;
  for (const candidate of urlVariants(url)) {
    let expected;
    try {
      expected = expectedSignature(authToken, candidate, params);
    } catch {
      continue;
    }
    if (matches(expected, signature)) ok = true;
  }
  return ok;
}

/**
 * The URL Twilio signed.
 *
 * Twilio signs the URL it was configured with, which is the public
 * https:// address. Behind Vercel's proxy the request object reports the
 * internal host and http, so rebuilding the URL from the incoming request
 * produces a different string and every signature fails. The public base
 * is therefore taken from configuration, not from the request — and a
 * forwarded host header is deliberately NOT trusted, since an attacker
 * controls it and could otherwise choose the string being signed.
 */
export function publicUrlFor(pathWithQuery, base = process.env.PUBLIC_BASE_URL) {
  const root = String(base || "https://sitebric.com").replace(/\/+$/, "");
  return `${root}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
}
