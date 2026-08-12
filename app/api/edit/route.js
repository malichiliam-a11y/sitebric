import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { limitsFor } from "@/lib/plans";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Used only for the generations_used increment — bypasses RLS since
// users don't have update permission on their own profile row.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const maxDuration = 300;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generations_used")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to edit sites." },
      { status: 402 }
    );
  }

  const limit = limitsFor(plan);
  if (profile.generations_used >= limit.generations) {
    return NextResponse.json(
      {
        error: "generation_limit",
        message: `You've used all ${limit.generations} generations for this month. Upgrade for more.`,
      },
      { status: 402 }
    );
  }

  const { projectId, instruction } = await req.json();
  if (!projectId || !instruction) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("code, user_id, status")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (project.status !== "done" || !project.code) {
    return NextResponse.json({ error: "Site isn't ready to edit yet" }, { status: 400 });
  }

  await supabase.from("projects").update({ status: "generating" }).eq("id", projectId);

  try {
    // Streamed, not a single buffered request — same reason as
    // app/api/generate/route.js: a 32k-token response runs long enough to
    // hit HTTP timeouts when buffered, and the connection dies mid-edit
    // with a bare "Load failed" and no server error to show.
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 32000,
      messages: [
        {
          role: "user",
          content: `Here is the current HTML for a client website:

${project.code}

Apply this requested change: "${instruction}"

Rules:
- Output ONLY the complete, updated raw HTML file, no markdown fences, no explanation.
- Keep everything else about the site exactly the same — same sections, same content, same images — unless the request implies changing them.
- Make the smallest change that fully satisfies the request; don't rewrite unrelated parts of the page.
- The result must still be a complete, valid, self-contained single HTML file (CSS in <style>, JS in <script>).
- If <head> is missing <meta name="viewport" content="width=device-width, initial-scale=1">, add it — without that exact tag, mobile browsers ignore responsive CSS and render at a shrunk-down fake desktop width.`,
        },
      ],
    });

    const data = await stream.finalMessage();

    let code = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/^```(html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    if (!code) throw new Error("empty response from model");

    await supabase.from("projects").update({ code, status: "done" }).eq("id", projectId);
    await supabaseAdmin
      .from("profiles")
      .update({ generations_used: profile.generations_used + 1 })
      .eq("id", user.id);

    return NextResponse.json({ status: "done" });
  } catch (err) {
    console.error("Edit failed:", err.message);
    // Revert to "done" with the old code still intact rather than
    // leaving it stuck on "generating" with the edit lost.
    await supabase.from("projects").update({ status: "done" }).eq("id", projectId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
