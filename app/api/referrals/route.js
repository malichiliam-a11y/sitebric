import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { limitsFor, PLAN_PRICES } from "@/lib/plans";

// Bypasses RLS — profiles' select policy only allows a user to read
// their own row, but this route needs every row referred by the
// caller's own code, which belongs to other users.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  const code = profile?.referral_code || null;
  if (!code) {
    return NextResponse.json({ code: null, signups: [] });
  }

  const { data: referred } = await supabaseAdmin
    .from("profiles")
    .select("plan, created_at")
    .eq("referred_by", code)
    .order("created_at", { ascending: false });

  const signups = (referred || []).map((row) => ({
    planLabel: limitsFor(row.plan).label,
    paid: PLAN_PRICES[row.plan] != null,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ code, signups });
}
