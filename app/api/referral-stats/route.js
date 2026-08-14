import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Bypasses RLS: a user's own profiles row only exposes their own data,
// but this needs every profile referred by them regardless of who owns
// each one.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  if (!profile?.referral_code) {
    return NextResponse.json({ referralCode: null, totalSignups: 0, activated: 0, rewardCents: 0 });
  }

  const { data: referred } = await supabaseAdmin
    .from("profiles")
    .select("referral_reward_granted")
    .eq("referred_by", profile.referral_code);

  const totalSignups = referred?.length || 0;
  const activated = (referred || []).filter((r) => r.referral_reward_granted).length;

  return NextResponse.json({
    referralCode: profile.referral_code,
    totalSignups,
    activated,
    rewardCents: activated * 500,
  });
}
