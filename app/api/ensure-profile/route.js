import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sanitizeReferralCode } from "@/lib/referral";

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
    // Only read on first creation — referred_by is set once and never
    // touched again, so a stale ref lingering in the caller's storage
    // can't retroactively attribute a returning user.
    const body = await req.json().catch(() => ({}));
    const referredBy = sanitizeReferralCode(body?.ref);

    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan: "trial",
      generations_used: 0,
      searches_used: 0,
      referred_by: referredBy,
    });
  }

  return NextResponse.json({ ok: true });
}
