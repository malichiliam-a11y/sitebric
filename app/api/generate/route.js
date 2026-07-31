import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: `Generate a COMPLETE, SELF-CONTAINED single HTML file for a small local business website.

Client/business: "${clientName}"
Brief: "${prompt}"

Rules:
- Output ONLY raw HTML, no markdown fences, no explanation.
- All CSS in <style>, all JS in <script>, inline, one file, no external dependencies (Google Fonts <link> is fine).
- Real, polished design with real copy for this specific business — not lorem ipsum.
- Include a clear hero, a services/about section, and a contact section at minimum.`,
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

    await supabase
      .from("projects")
      .update({ code, status: "done" })
      .eq("id", project.id);

    return NextResponse.json({ id: project.id, status: "done" });
  } catch (err) {
    console.error("Generation failed:", err.message);
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", project.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
