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
function urlVariants(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return [url];
  }

  // Built by hand rather than through the URL API, which is the whole
  // trick: assigning parsed.port = "443" on an https URL is a no-op,
  // because 443 is the default and the URL object drops it. The variant
  // that includes the standard port can therefore only be produced as a
  // string. Missing this made every :443 signature fail — 999 of 3000
  // cross-checked cases against Twilio's own library.
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

  const noPort = new URL(parsed.toString());
  noPort.port = "";

  const withPort = parsed.port ? parsed.toString() : withStandardPort(parsed);

  // Re-encoded query: parsed and re-serialised, which normalises "+"
  // versus "%20" and any other encoding difference between the sender
  // and us. Twilio sends FromCity, CallerName and SpeechResult, all of
  // which routinely contain spaces.
  // Both encodings, because the two sides disagree in both directions.
  // URLSearchParams writes a space as "+"; Node's querystring — which is
  // what Twilio's own validator re-serialises with — writes it as "%20".
  // Producing only one of them left a real asymmetry: signed with "%20",
  // arriving as "+", refused.
  const reencoded = (str) => {
    let u;
    try {
      u = new URL(str);
    } catch {
      return [];
    }
    if (!u.search) return [];
    const plus = new URLSearchParams(u.search.slice(1)).toString();
    const percent = plus.replace(/\+/g, "%20");
    const hadPort = /^[^/]*:\d+/.test(str.replace(/^[a-z]+:\/\//i, ""));
    u.search = "";
    const base = (hadPort && !u.port ? withStandardPort(u) : u.toString()).replace(/\?$/, "");
    return [`${base}?${plus}`, `${base}?${percent}`];
  };

  const forms = [noPort.toString(), withPort];
  return [...new Set([...forms, ...forms.flatMap(reencoded)])];
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
