import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to edit sites." },
      { status: 402 }
    );
  }

  // Editing does NOT cost a generation, and must not start doing so.
  //
  // The pricing page has always said, in as many words: "Editing a site
  // afterwards is unlimited and free — a generation is only used when a
  // new site is created." This route charged one anyway and refused the
  // edit once the month's allowance was gone, so a Starter customer who
  // built five sites could no longer fix a typo on any of them. People
  // bought the plan on the sentence, so the sentence is what is right and
  // the code was what was wrong.
  //
  // An edit cannot be used to get more sites out of a plan — it rewrites
  // a project that already exists, and the number of projects is capped
  // by plan in /api/generate. If edit volume ever becomes a real cost
  // problem, cap it per hour rather than reintroducing a charge that
  // contradicts the price list.

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

    return NextResponse.json({ status: "done" });
  } catch (err) {
    console.error("Edit failed:", err.message);
    // Revert to "done" with the old code still intact rather than
    // leaving it stuck on "generating" with the edit lost.
    await supabase.from("projects").update({ status: "done" }).eq("id", projectId);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
