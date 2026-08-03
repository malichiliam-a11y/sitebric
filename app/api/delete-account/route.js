import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  try {
    const { error: projectsError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", user.id);

    if (projectsError) throw new Error(projectsError.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) throw new Error(profileError.message);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authError) throw new Error(authError.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Account deletion failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
