import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { releaseNumber } from "@/lib/twilio-numbers";
import { numberDueForRelease, NUMBER_RELEASE_DAYS } from "@/lib/entitlements";

// Hands phone numbers back to Twilio once an account has been gone long
// enough that they are clearly not coming back.
//
// This is what stops the bleeding. Cancelling used to leave every
// receptionist number renting from Twilio every month, forever, against
// no revenue at all — the only cost in this product that grows on its own
// and never stops. One customer with ten lines who cancels is roughly
// $11.50 a month out of Sitebric's pocket, indefinitely.
//
// It is also the single irreversible step in the whole cancellation path,
// which is why it waits NUMBER_RELEASE_DAYS rather than the three-day
// grace the sites get. Once a number is released it is gone: it can be
// reissued to somebody else, and any business that pointed their line at
// it has a dead phone with no way back. Everything cheap and reversible
// happens weeks earlier; by the time anything reaches this route the
// account has been dark for a month.

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Bounded per run. Releasing is a network call each, and a huge backlog
// should be worked through over several days rather than risk timing out
// halfway with no record of what was done.
const MAX_PER_RUN = 25;

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // A missing secret must not mean "anyone may run this". Same reasoning
  // as the voice webhooks: an unconfigured deployment refuses rather than
  // exposes an endpoint that permanently destroys customer resources.
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - NUMBER_RELEASE_DAYS * 86_400_000).toISOString();

  // Only accounts that lapsed before the cutoff. The plan is re-checked
  // per row below rather than trusted from this filter alone.
  const { data: lapsed, error } = await supabaseAdmin
    .from("profiles")
    .select("id, plan, plan_ended_at")
    .not("plan_ended_at", "is", null)
    .lte("plan_ended_at", cutoff)
    .limit(200);

  if (error) {
    console.error("reclaim: could not read profiles:", error.message);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  if (!lapsed || lapsed.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  // The decision is made by the same pure function the rest of the
  // product uses, not by the SQL filter above — so a plan that came back
  // to life, or a date that is somehow in the future, cannot slip through
  // on a query the module never saw.
  const due = lapsed.filter((p) =>
    numberDueForRelease({ plan: p.plan, planEndedAt: p.plan_ended_at })
  );
  if (due.length === 0) return NextResponse.json({ released: 0 });

  const { data: numbers } = await supabaseAdmin
    .from("receptionist_numbers")
    .select("id, user_id, phone_number, twilio_sid, is_demo")
    .in("user_id", due.map((p) => p.id))
    // The public demo line is Sitebric's own and is never reclaimed, even
    // if the owner's own subscription lapses while testing.
    .eq("is_demo", false)
    .limit(MAX_PER_RUN);

  if (!numbers || numbers.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  let released = 0;
  for (const number of numbers) {
    // Twilio first. If the row went first and this failed, the number
    // would keep billing every month with nothing left pointing at it —
    // exactly the leak this route exists to close.
    const result = await releaseNumber(number.twilio_sid);
    if (!result.released) {
      console.error(`reclaim: Twilio would not release ${number.phone_number}`);
      continue;
    }

    const { error: delError } = await supabaseAdmin
      .from("receptionist_numbers")
      .delete()
      .eq("id", number.id);

    if (delError) {
      console.error(`reclaim: released ${number.phone_number} but row remains:`, delError.message);
      continue;
    }
    released++;
  }

  console.log(`reclaim: released ${released} number(s)`);
  return NextResponse.json({ released, considered: numbers.length });
}
