import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const maxDuration = 60;

// Days that must pass before each step goes out. Index 0 is measured from
// signup, the rest from the previous nudge — so the sequence lands roughly
// on day 1, day 4 and day 11.
const GAP_DAYS = [1, 3, 7];
const MAX_STEP = GAP_DAYS.length;

// Three drop-off patterns, three touches each. The state is re-checked on
// every run rather than remembered, so someone who generates a site after
// nudge 1 gets the "publish it" track for nudge 2 instead of being told
// again to do the thing they've already done.
//
// Nothing here claims the trial expires — it doesn't. The limit is two
// generations, not a clock, and inventing a deadline to manufacture
// urgency would be a lie the product doesn't back up.
const MESSAGES = {
  // Signed up, never generated anything. The biggest group by far.
  no_site: [
    {
      subject: "You haven't built your first site yet",
      text: `You signed up for Sitebric but haven't generated a site yet.

It takes under a minute: describe a local business, get back a full site you could charge $500-$2,000 for. Your free trial covers it — no card needed to try the first one: https://www.sitebric.com/dashboard`,
    },
    {
      subject: "Pick a business you already know",
      text: `The hardest part of the first site is deciding what to build, so don't decide — use one you already know.

The barber you go to. The corner store. Your cousin's landscaping thing. Type the name and one sentence about what they do, and you'll have a real site to look at before you've finished your coffee.

Two free generations are sitting on your account: https://www.sitebric.com/dashboard`,
    },
    {
      subject: "Last one from me",
      text: `This is the last email I'll send about getting started — I'm not going to keep nagging.

Your two free generations don't expire, so they'll be there whenever you want them: https://www.sitebric.com/dashboard

And if something got in the way — it wasn't clear, it didn't work, it wasn't what you expected — just reply to this email and tell me. I read them.`,
    },
  ],

  // Generated at least one site but never published it.
  unpublished: [
    {
      subject: "Your site is ready to publish",
      text: `You generated a site on Sitebric — it's sitting done, unpublished.

Publishing takes one click, and once it's live you can hand it to a client and charge $500-$2,000 for it. Log in and hit Publish: https://www.sitebric.com/dashboard`,
    },
    {
      subject: "That site is still unpublished",
      text: `The site you generated is still sitting in your dashboard, unpublished.

A live link is what makes it real to a client — it's the difference between "I could build you a website" and "here's your website." One click and it has a real URL you can send: https://www.sitebric.com/dashboard`,
    },
    {
      subject: "Last one from me",
      text: `Last email about this one — your generated site is still unpublished.

It'll keep sitting there, so publish it whenever you're ready: https://www.sitebric.com/dashboard

If something stopped you — it didn't look right, or you weren't sure what to do next — reply and tell me. I read them.`,
    },
  ],

  // Published a real site. Closest to paying; talk about the next one.
  published: [
    {
      subject: "Your client's site is live — here's what's next",
      text: `You published a real, live site on Sitebric — that's the hard part done.

Most resellers charge $500-$2,000 for exactly what you just built in under a minute. If you want to keep building for more clients, upgrade and keep going: https://www.sitebric.com/pricing`,
    },
    {
      subject: "Ready for the next client?",
      text: `You've already shipped one live site, so you know it works.

The second one is the same minute of work — and there's an invoice tool in the dashboard, so you can bill for both without setting up anything else. Starter is $15/month and covers 10 generations: https://www.sitebric.com/pricing`,
    },
    {
      subject: "Last one from me",
      text: `Last email from me — you shipped a live site, which is more than most people who sign up ever do.

If you want more generations, plans start at $15/month: https://www.sitebric.com/pricing

And if you tried to keep going and something got in the way, reply and tell me what happened. I read them.`,
    },
  ],
};

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// Run daily by Vercel Cron (see vercel.json). Walks trial users through a
// three-message sequence, at most one message per user per run, and stops
// entirely once they upgrade or the sequence is finished.
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Upgrading takes someone out of plan='trial', so a paying customer can
  // never receive the rest of the sequence.
  const { data: candidates } = await supabaseAdmin
    .from("profiles")
    .select("id, created_at, trial_nudge_sent_at, trial_nudge_step")
    .eq("plan", "trial")
    .lt("trial_nudge_step", MAX_STEP)
    .limit(200);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // The wait before each step is measured from a different anchor, so this
  // is filtered here rather than in the query.
  const due = candidates.filter((p) => {
    const step = p.trial_nudge_step || 0;
    const since = step === 0 ? p.created_at : p.trial_nudge_sent_at;
    if (!since) return false;
    return daysSince(since) >= GAP_DAYS[step];
  });

  let sent = 0;
  const counts = {};

  for (const profile of due.slice(0, 50)) {
    const step = profile.trial_nudge_step || 0;

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("status, published")
      .eq("user_id", profile.id);

    const doneCount = (projects || []).filter((p) => p.status === "done").length;
    const publishedCount = (projects || []).filter((p) => p.published).length;

    const track = publishedCount > 0 ? "published" : doneCount > 0 ? "unpublished" : "no_site";
    const { subject, text } = MESSAGES[track][step];
    const nudgeType = `${track}_${step + 1}`;

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
      counts[nudgeType] = (counts[nudgeType] || 0) + 1;
    } catch (err) {
      console.error("Nudge email failed for", profile.id, err.message);
      // Leave the step untouched so tomorrow's run retries this person
      // rather than skipping them forward past a message they never got.
      continue;
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        trial_nudge_sent_at: new Date().toISOString(),
        trial_nudge_type: nudgeType,
        trial_nudge_step: step + 1,
      })
      .eq("id", profile.id);
  }

  return NextResponse.json({ sent, due: due.length, counts });
}
