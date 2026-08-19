import { createClient } from "@supabase/supabase-js";
import { isValidTwilioRequest, publicUrlFor } from "@/lib/twilio-signature";

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

  let params;
  try {
    const form = await req.formData();
    params = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return { ok: false, reason: "unreadable body" };
  }

  const signature = req.headers.get("x-twilio-signature");
  const url = publicUrlFor(pathWithQuery);

  if (!isValidTwilioRequest({ authToken, url, params, signature })) {
    // Deliberately not logged with the signature or the body — a log of
    // failed attempts alongside what was sent is a gift to whoever is
    // probing.
    return { ok: false, reason: "bad signature" };
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
