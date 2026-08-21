import { createClient } from "@supabase/supabase-js";
import { isValidTwilioRequest, publicUrlFor, urlVariants } from "./twilio-signature.js";

// Shared front door for every /api/voice/* webhook.
//
// These are public URLs that answer telephones, write rows into customer
// dashboards, and spend money on model calls on every request. Each one
// needs the same three things before it does anything: parse the form
// body Twilio posts, prove the request is Twilio's, and get a database
// client that can write (the webhooks have no logged-in user, so RLS
// cannot be the thing protecting these rows — the signature is).

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Reads and authenticates a Twilio webhook.
 *
 * Returns { ok: true, params } or { ok: false, reason }.
 *
 * Fails closed in every direction, including when no auth token is
 * configured at all — an unconfigured deployment must reject calls, not
 * accept anonymous ones.
 */
export async function readTwilioRequest(req, pathWithQuery) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return { ok: false, reason: "no auth token configured" };

  // Twilio may be configured to call a webhook with either method, and a
  // number can end up on GET without anyone choosing it. These routes
  // answered POST only, so a GET got Next's 405 before any of our code
  // ran — and what the caller heard was "an application error has
  // occurred". Nothing was logged, because the request never reached a
  // handler to log it.
  //
  // The two methods are signed differently, and getting that wrong fails
  // every signature rather than failing open:
  //
  //   POST — sign the configured URL, then append each body parameter
  //          as key+value in key order.
  //   GET  — sign the full URL *including* its query string, and append
  //          nothing, because the parameters are already in it.
  const isGet = String(req.method || "").toUpperCase() === "GET";

  let params;
  let url;
  let signedParams;

  if (isGet) {
    let reqUrl;
    try {
      reqUrl = new URL(req.url);
    } catch {
      return { ok: false, reason: "unreadable url" };
    }
    params = Object.fromEntries([...reqUrl.searchParams.entries()]);
    // Built from the request's own path and query, not from
    // pathWithQuery: on a GET, Twilio appends the call parameters to
    // whatever query the URL already had, so the caller cannot know the
    // full string in advance. Only the host comes from configuration —
    // see publicUrlFor for why the request's own host is never trusted.
    url = publicUrlFor(`${reqUrl.pathname}${reqUrl.search}`);
    signedParams = {};
  } else {
    try {
      const form = await req.formData();
      params = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    } catch {
      return { ok: false, reason: "unreadable body" };
    }
    url = publicUrlFor(pathWithQuery);
    signedParams = params;
  }

  const signature = req.headers.get("x-twilio-signature");

  let ok = isValidTwilioRequest({ authToken, url, params: signedParams, signature });

  // One more shape, for GET only.
  //
  // A 301 or 302 turns a POST into a GET — that is ordinary HTTP, and
  // this app redirects between its apex and www. If the signature was
  // computed for the original POST and not recomputed after the
  // redirect, it is a POST-style signature arriving on a GET: hashed
  // over the URL WITHOUT its query, with the parameters appended.
  //
  // This does not weaken anything. The parameters being appended are the
  // same ones already in the URL, on the same path, and the HMAC still
  // has to match a secret nobody else has. It accepts one more way of
  // being right, not one more thing as right.
  if (!ok && isGet) {
    const withoutQuery = url.split("?")[0];
    ok = isValidTwilioRequest({ authToken, url: withoutQuery, params, signature });
  }

  if (!ok) {
    // The signature and the body are deliberately never logged — a record
    // of failed attempts alongside what was sent is a gift to whoever is
    // probing.
    //
    // The URL we built is logged, because it is our own public address
    // rather than anything secret, and because without it a rejection is
    // undebuggable from the outside. Two real calls were lost guessing at
    // this; the string we hashed is the one fact that settles it.
    // The URLs we hashed are logged; the signature and the body never
    // are. A record of failed attempts next to what was sent is a gift to
    // whoever is probing, but our own public address is not a secret —
    // and without it a rejection cannot be debugged from outside. Four
    // rounds were lost to guessing at exactly this.
    const tried = urlVariants(url);
    return {
      ok: false,
      reason:
        `bad signature (${isGet ? "GET" : "POST"}, signed url: ${url}` +
        `, ${tried.length} variants tried: ${tried.map((u) => u.split("?")[0]).join(" | ")})`,
    };
  }

  return { ok: true, params };
}

// A caller's phone number, from Twilio's own metadata rather than from
// anything spoken. Kept in E.164 so it can be dialled back directly.
export function normalizeNumber(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^0-9+]/g, "");
  return digits.startsWith("+") ? digits.slice(0, 20) : digits ? `+${digits}`.slice(0, 20) : "";
}
