import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { canUseReceptionist, numbersAllowed, limitsFor } from "@/lib/plans";
import { isOwner } from "@/lib/admin";
import { isKnownVoice } from "@/lib/voices";
import { bookingUrl } from "@/lib/booking";
import { receptionistLocked, lockedNotice } from "@/lib/feature-lock";
import { findAvailableNumbers, buyNumber, releaseNumber, twilioConfigured } from "@/lib/twilio-numbers";

// Buying, configuring and releasing a receptionist number.
//
// Reads go through the user's own client so RLS is what isolates them.
// Writes go through the service role, deliberately: a user must not be
// able to hand themselves a phone number, raise their own minute ceiling,
// or edit what was said on a call.

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The owner's own ceiling. Not unlimited — a runaway loop buying numbers
// would spend real money — but high enough that it is never the thing in
// the way while the product is being demonstrated.
const OWNER_ALLOWANCE = 25;

function field(value, max = 300) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

// A number we are going to hand to <Dial>. Only ever E.164.
function dialable(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^0-9+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return /^\+[1-9]\d{6,15}$/.test(e164) ? e164 : "";
}

async function me() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(req) {
  const { supabase, user } = await me();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  // Temporarily off for everyone but the owner. See lib/feature-lock.js —
  // this is a holding measure with an end date, not a plan.
  if (receptionistLocked() && !isOwner(user.email)) {
    return NextResponse.json({ locked: true, ...lockedNotice() });
  }

  const url = new URL(req.url);

  // Number search is a lookup, not a purchase — nothing is bought and
  // nothing is billed until POST.
  if (url.searchParams.get("search") === "1") {
    if (!twilioConfigured()) {
      return NextResponse.json({ numbers: [], notConfigured: true });
    }
    try {
      const numbers = await findAvailableNumbers({
        country: url.searchParams.get("country") || "US",
        areaCode: url.searchParams.get("areaCode") || "",
      });
      return NextResponse.json({ numbers });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
  }

  const [{ data: numbers }, { data: calls }, { data: profile }, { data: demo }] =
    await Promise.all([
      supabase.from("receptionist_numbers").select("*").order("created_at", { ascending: false }),
      supabase
        .from("receptionist_calls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
      // The demo line, read with the service role because it belongs to
      // the owner's account and RLS would hide it from everybody else —
      // which is precisely the people it exists for.
      supabaseAdmin
        .from("receptionist_numbers")
        .select("phone_number, business_name")
        .eq("is_demo", true)
        .maybeSingle(),
    ]);

  return NextResponse.json({
    numbers: numbers || [],
    calls: calls || [],
    available: twilioConfigured(),
    // Decided here rather than in the browser. The owner check reads an
    // email, and an email compiled into the client bundle is on every
    // visitor's machine — the answer travels instead of the rule.
    canUse: canUseReceptionist(profile?.plan) || isOwner(user.email),
    // How many lines this plan may hold at once, and what the plan is
    // called, so the dashboard can say "1 of 3" and name the plan without
    // shipping the table to the browser. The owner gets the top ceiling
    // for the same reason they bypass canUse: they carry the bill.
    allowance: isOwner(user.email) ? OWNER_ALLOWANCE : numbersAllowed(profile?.plan),
    planLabel: limitsFor(profile?.plan).label,
    // Deliberately returned regardless of plan. Somebody who cannot use
    // the feature yet is exactly who needs to hear it.
    demo: demo ? { phoneNumber: demo.phone_number, businessName: demo.business_name } : null,
    // Drives the owner-only "use this as the demo line" toggle. The
    // answer travels, not the rule — same reason as canUse above.
    isOwnerAccount: isOwner(user.email),
  });
}

export async function POST(req) {
  const { supabase, user } = await me();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  if (receptionistLocked() && !isOwner(user.email)) {
    return NextResponse.json({ error: "locked", ...lockedNotice() }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  // Every paid plan holds lines; a trial or a lapsed account holds none.
  // What those accounts get instead is the public demo number, which they
  // can ring without paying anything — see canUseReceptionist in
  // lib/plans.js for why a rented line isn't given away.
  if (!canUseReceptionist(profile?.plan) && !isOwner(user.email)) {
    return NextResponse.json(
      {
        error: "plan_required",
        message:
          "Ring the demo number to hear it working — your own lines come with any paid plan.",
      },
      { status: 402 }
    );
  }

  if (!twilioConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Phone numbers aren't switched on yet." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const businessName = field(body.businessName, 120);
  const phoneNumber = field(body.phoneNumber, 20);
  if (!businessName || !phoneNumber) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // How many numbers one account may hold. Every number is a monthly
  // Twilio charge whether or not it ever rings, so this is a real spend
  // ceiling rather than a product limit — and it is the one thing that
  // still scales with the plan now that the feature itself doesn't.
  const allowance = isOwner(user.email) ? OWNER_ALLOWANCE : numbersAllowed(profile?.plan);
  const { count } = await supabase
    .from("receptionist_numbers")
    .select("id", { count: "exact", head: true });
  if ((count || 0) >= allowance) {
    return NextResponse.json(
      {
        error: "too_many",
        message:
          allowance === 1
            ? `${limitsFor(profile?.plan).label} includes one line. Upgrade for more, or give this one back first.`
            : `That's all ${allowance} lines on ${limitsFor(profile?.plan).label}. Upgrade for more, or give one back first.`,
      },
      { status: 402 }
    );
  }

  let bought;
  try {
    bought = await buyNumber({ phoneNumber });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const { data, error } = await supabaseAdmin
    .from("receptionist_numbers")
    .insert({
      user_id: user.id,
      project_id: field(body.projectId, 40) || null,
      business_name: businessName,
      phone_number: bought.phoneNumber,
      twilio_sid: bought.sid,
      forward_to: dialable(body.forwardTo),
      business_facts: field(body.businessFacts, 4000),
      greeting: field(body.greeting, 400),
    })
    .select()
    .single();

  if (error) {
    // The number exists on the Twilio bill but we have no row for it, so
    // it is handed straight back rather than left to charge monthly for
    // something nobody can see or use.
    await releaseNumber(bought.sid);
    console.error("receptionist insert failed:", error.message);
    return NextResponse.json({ error: "could not set that number up" }, { status: 500 });
  }

  return NextResponse.json({ number: data });
}

export async function PATCH(req) {
  const { supabase, user } = await me();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  if (receptionistLocked() && !isOwner(user.email)) {
    return NextResponse.json({ error: "locked", ...lockedNotice() }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = field(body.id, 40);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // Ownership is checked against the user's own client, so RLS decides it
  // rather than this route.
  const { data: owned } = await supabase
    .from("receptionist_numbers")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Only these four. Notably NOT minutes_limit or minutes_used — that is
  // the spend ceiling, and it is not the spender's to move.
  const patch = {};
  if ("businessName" in body) patch.business_name = field(body.businessName, 120);
  if ("businessFacts" in body) patch.business_facts = field(body.businessFacts, 4000);
  if ("greeting" in body) patch.greeting = field(body.greeting, 400);
  if ("forwardTo" in body) patch.forward_to = dialable(body.forwardTo);
  if ("active" in body) patch.active = Boolean(body.active);
  // Validated against the allowlist rather than stored as typed. An
  // unrecognised voice does not error on Twilio's side — it silently
  // falls back to their robotic default, so a bad value would be
  // invisible until a caller heard it.
  if ("voice" in body) patch.voice = isKnownVoice(body.voice) ? String(body.voice).trim() : "";
  // Normalised on the way in rather than stored as typed. This link gets
  // texted from the business's own number to someone who just rang them,
  // so anything not a clean https URL turns the feature off for that line
  // instead of putting something dubious in that message.
  if ("bookingUrl" in body) patch.booking_url = bookingUrl(body.bookingUrl);
  // Owner only. This is the one number in the system a stranger can dial,
  // and every call on it spends money that nobody is paying for.
  if ("isDemo" in body && isOwner(user.email)) patch.is_demo = Boolean(body.isDemo);

  const { data, error } = await supabaseAdmin
    .from("receptionist_numbers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("receptionist patch failed:", error.message);
    return NextResponse.json({ error: "could not save that" }, { status: 500 });
  }
  return NextResponse.json({ number: data });
}

export async function DELETE(req) {
  const { supabase, user } = await me();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  if (receptionistLocked() && !isOwner(user.email)) {
    return NextResponse.json({ error: "locked", ...lockedNotice() }, { status: 403 });
  }

  const id = field(new URL(req.url).searchParams.get("id"), 40);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: owned } = await supabase
    .from("receptionist_numbers")
    .select("id, twilio_sid")
    .eq("id", id)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Given back first. If the row went first and this failed, the number
  // would keep billing with nothing pointing at it.
  await releaseNumber(owned.twilio_sid);

  const { error } = await supabase.from("receptionist_numbers").delete().eq("id", id);
  if (error) {
    console.error("receptionist delete failed:", error.message);
    return NextResponse.json({ error: "could not remove that number" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
