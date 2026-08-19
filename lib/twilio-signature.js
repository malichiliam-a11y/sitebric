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
export function isValidTwilioRequest({ authToken, url, params, signature }) {
  if (!authToken || !signature || typeof signature !== "string") return false;

  let expected;
  try {
    expected = expectedSignature(authToken, url, params);
  } catch {
    return false;
  }

  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(signature, "utf-8");
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // signal, so the lengths are compared first and the result is the same
  // either way.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
