import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Give this function up to 5 minutes — large site generations can
// genuinely take a few minutes, and cutting it short leaves things
// stuck on "generating" with no error ever being recorded.
export const maxDuration = 300;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { clientName, prompt } = await req.json();
  if (!clientName || !prompt) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Create the row first so the dashboard can show a "generating" state
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      client_name: clientName,
      prompt,
      status: "generating",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

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
            content: `Generate a COMPLETE, SELF-CONTAINED single HTML file for a small local business website.

Client/business: "${clientName}"
Brief: "${prompt}"

Rules:
- Output ONLY raw HTML, no markdown fences, no explanation.
- All CSS in <style>, all JS in <script>, inline, one file (Google Fonts <link> is fine).
- Real, polished design with real copy for this specific business — not lorem ipsum.
- Include a clear hero, a services/about section, a "why choose us" section, a "how it works" or process section (if relevant to the business), and a contact section at minimum.
- Keep CSS efficient and avoid unnecessary repetition, so the full page always finishes within the response.
- Use REAL photos, not just gradients/CSS shapes: pull relevant images from https://loremflickr.com/900/600/<relevant-keywords> (comma-separated, e.g. /900/600/luxury,car,detailing) for the hero, gallery, and service sections. Pick keywords specific to this business, and vary the size per placement (e.g. /500/400/ for smaller cards).
- If the business has a natural before/after angle (detailing, renovation, fitness, cleaning, landscaping, etc.), build a REAL functional before/after image comparison slider: two stacked images, a draggable handle (range input or mouse/touch drag) controlling a clip-path to reveal one image over the other. Make it actually work, not decorative.`,
          },
        ],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error("Anthropic API error:", anthropicRes.status, JSON.stringify(data));
      throw new Error(
        `Anthropic API error (${anthropicRes.status}): ${data?.error?.message || "unknown"}`
      );
    }

    let code = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/^```(html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    if (!code) throw new Error("empty response from model");

    const { error: updateError } = await supabase
      .from("projects")
      .update({ code, status: "done" })
      .eq("id", project.id);

    if (updateError) {
      console.error("Failed to save generated site:", updateError.message);
      throw new Error(`Failed to save site: ${updateError.message}`);
    }

    return NextResponse.json({ id: project.id, status: "done" });
  } catch (err) {
    console.error("Generation failed:", err.message);
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", project.id);
    // Temporarily returning the real error message so we can debug.
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
