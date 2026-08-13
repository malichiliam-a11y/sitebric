import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sanitizeReferralCode, randomReferralCode } from "@/lib/referral";
import { sanitizeUtmValue } from "@/lib/utm";

// Bypasses RLS to create the initial trial row — safe since it only
// ever inserts a fixed starting state for the currently authenticated
// user's own id, never arbitrary data.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    // Only read on first creation — referred_by and utm_* are set once
    // and never touched again, so stale values lingering in the caller's
    // storage can't retroactively attribute a returning user.
    const body = await req.json().catch(() => ({}));
    const referredBy = sanitizeReferralCode(body?.ref);

    // Every user gets their own shareable code so referrals aren't
    // limited to the handful of codes issued out-of-band (like APEX).
    // Collisions are astronomically unlikely at 32^6, but check anyway
    // since the column is unique and a collision would fail the upsert.
    let ownCode = null;
    for (let attempt = 0; attempt < 5 && !ownCode; attempt++) {
      const candidate = randomReferralCode();
      const { data: taken } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("referral_code", candidate)
        .maybeSingle();
      if (!taken) ownCode = candidate;
    }

    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan: "trial",
      generations_used: 0,
      searches_used: 0,
      referred_by: referredBy,
      referral_code: ownCode || `${randomReferralCode()}${Date.now().toString(36).slice(-3).toUpperCase()}`,
      utm_source: sanitizeUtmValue(body?.utm_source),
      utm_medium: sanitizeUtmValue(body?.utm_medium),
      utm_campaign: sanitizeUtmValue(body?.utm_campaign),
    });
  }

  return NextResponse.json({ ok: true });
}
