import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Bypasses RLS to create the initial trial row — safe since it only
// ever inserts a fixed starting state for the currently authenticated
// user's own id, never arbitrary data.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST() {
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
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan: "trial",
      generations_used: 0,
      searches_used: 0,
    });
  }

  return NextResponse.json({ ok: true });
}
