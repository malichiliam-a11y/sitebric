import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 300;

const LIMITS = {
  starter: { generations: 10 },
  growth: { generations: 40 },
  pro: { generations: 150 },
};

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

  const limit = LIMITS[plan];
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
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
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
- The result must still be a complete, valid, self-contained single HTML file (CSS in <style>, JS in <script>).`,
          },
        ],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic API error (${anthropicRes.status}): ${data?.error?.message || "unknown"}`);
    }

    let code = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/^```(html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    if (!code) throw new Error("empty response from model");

    await supabase.from("projects").update({ code, status: "done" }).eq("id", projectId);
    await supabase
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
