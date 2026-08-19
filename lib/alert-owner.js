// Tells the owner when the product has stopped working.
//
// Written the night the Anthropic credit balance ran dry. Generation was
// dead for about five hours and the way it came to light was a paying
// customer sending a screenshot — by which point he had tried three
// times, and a trial user had spent his entire trial on two failures and
// left. Nothing in the system said a word.
//
// Deliberately fire-and-forget: alerting must never be able to turn a
// failing generation into a *differently* failing generation. Every path
// here swallows its own errors and returns rather than throwing.

import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// When the credit runs out, every generation fails. Without this window
// an outage would mean one email per attempt, which buries the one piece
// of information that matters.
const QUIET_MINUTES = 60;

const MESSAGES = {
  api_credit: {
    subject: "Sitebric is down — Anthropic credit exhausted",
    body: (detail) => `Site generation is failing for every user right now.

The Anthropic API rejected the request because the credit balance is empty:

  ${detail}

Fix: add credit at https://console.anthropic.com/settings/billing
Generation starts working again the moment it clears — nothing to deploy.

Worth turning on auto-reload while you are there, so this cannot happen
again from an empty balance alone.

You are getting this once an hour at most while the problem lasts.`,
  },
};

/**
 * Emails the owner about a system-level failure, at most once an hour per
 * kind. Never throws.
 */
export async function alertOwner(kind, detail = "") {
  const template = MESSAGES[kind];
  if (!template) return { sent: false, reason: "unknown kind" };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "no mail key" };

  try {
    const since = new Date(Date.now() - QUIET_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("system_alerts")
      .select("id")
      .eq("kind", kind)
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) return { sent: false, reason: "already alerted" };

    // Recorded before sending, not after. If the send throws, the row
    // still suppresses the next fifty attempts — one missed email during
    // an outage is a far better failure than a mailbox full of them.
    await supabaseAdmin.from("system_alerts").insert({ kind, detail: detail.slice(0, 2000) });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sitebric <hello@sitebric.com>",
        to: ADMIN_EMAIL,
        subject: template.subject,
        text: template.body(detail || "(no detail)"),
      }),
    });

    if (!res.ok) {
      console.error(`alertOwner: Resend responded ${res.status}`);
      return { sent: false, reason: `resend ${res.status}` };
    }

    console.warn(`alertOwner: sent "${kind}" to the owner`);
    return { sent: true };
  } catch (err) {
    // The generation that triggered this is already failing; this must
    // not add a second failure on top of it.
    console.error("alertOwner failed:", err?.message);
    return { sent: false, reason: "threw" };
  }
}
