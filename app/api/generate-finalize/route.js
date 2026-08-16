import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { assembleSite } from "@/lib/multipage";
import { stripFakePhoneNumbers } from "@/lib/sanitize-site";
import { friendlyGenerationError } from "@/lib/generation-errors";
import { generationCost } from "@/lib/plans";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// No model calls here at all — the pieces are already generated and
// stored. This just stitches them, so it is fast and cannot time out.
export const maxDuration = 60;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_name, status, build, phone")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Finalising twice would charge twice. The first one through wins.
  if (project.status === "done") {
    return NextResponse.json({ id: project.id, status: "done", alreadyDone: true });
  }

  try {
    let code = assembleSite({
      shell: project.build?.shell,
      pages: project.build?.pages,
      clientName: project.client_name,
    });

    const sanitized = stripFakePhoneNumbers(code, project.phone || "");
    if (sanitized.changed > 0) {
      console.warn(
        `Rewrote ${sanitized.changed} fabricated phone reference(s) in project ${project.id}`
      );
      code = sanitized.code;
    }

    // Only rows still generating are moved to done, so two finalise calls
    // racing each other cannot both bill the user.
    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update({ code, status: "done", completed_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .eq("status", "generating")
      .select("id");

    if (updateError) throw new Error(`Failed to save site: ${updateError.message}`);
    if (!updated || updated.length === 0) {
      return NextResponse.json({ id: projectId, status: "done", alreadyDone: true });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("generations_used")
      .eq("id", user.id)
      .single();

    await supabaseAdmin
      .from("profiles")
      .update({ generations_used: (profile?.generations_used || 0) + generationCost(true) })
      .eq("id", user.id);

    return NextResponse.json({ id: projectId, status: "done" });
  } catch (err) {
    console.error("Finalize failed:", err?.message);
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", projectId)
      .eq("user_id", user.id);
    return NextResponse.json({ error: friendlyGenerationError(err) }, { status: 500 });
  }
}
