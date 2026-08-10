import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const maxDuration = 60;

// Run daily by Vercel Cron (see vercel.json). Finds trial users who signed
// up more than a day ago and haven't been nudged yet, figures out which of
// three actual drop-off patterns they're in, and sends exactly one email
// matched to it — never resent, tracked via trial_nudge_sent_at.
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabaseAdmin
    .from("profiles")
    .select("id, created_at")
    .eq("plan", "trial")
    .is("trial_nudge_sent_at", null)
    .lt("created_at", oneDayAgo)
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const profile of candidates) {
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("status, published")
      .eq("user_id", profile.id);

    const doneCount = (projects || []).filter((p) => p.status === "done").length;
    const publishedCount = (projects || []).filter((p) => p.published).length;

    let nudgeType, subject, text;
    if (publishedCount > 0) {
      nudgeType = "published_upgrade";
      subject = "Your client's site is live — here's what's next";
      text = `You published a real, live site on Sitebric — that's the hard part done.

Most resellers charge $500-$2,000 for exactly what you just built in under a minute. If you want to keep building for more clients, upgrade and keep going: https://sitebric.com/pricing

— Sitebric`;
    } else if (doneCount > 0) {
      nudgeType = "publish_and_upgrade";
      subject = "Your site is ready to publish";
      text = `You generated a site on Sitebric — it's sitting done, unpublished.

Publishing takes one click, and once it's live you can hand it to a client and charge $500-$2,000 for it. Log in and hit Publish: https://sitebric.com/dashboard

— Sitebric`;
    } else {
      nudgeType = "try_generate";
      subject = "You haven't built your first site yet";
      text = `You signed up for Sitebric but haven't generated a site yet.

It takes under a minute: describe a local business, get back a full site you could charge $500-$2,000 for. Your free trial covers it — no card needed to try the first one: https://sitebric.com/dashboard

— Sitebric`;
    }

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (!email) continue;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sitebric <hello@sitebric.com>",
          to: [email],
          reply_to: "supportsitebric@gmail.com",
          subject,
          text,
        }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      sent++;
    } catch (err) {
      console.error("Nudge email failed for", profile.id, err.message);
      // Don't mark as sent — leave it for tomorrow's run to retry.
      continue;
    }

    await supabaseAdmin
      .from("profiles")
      .update({ trial_nudge_sent_at: new Date().toISOString(), trial_nudge_type: nudgeType })
      .eq("id", profile.id);
  }

  return NextResponse.json({ sent, candidates: candidates.length });
}
