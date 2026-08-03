
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Used only for the generations_used increment at the end — that write
// needs to bypass RLS since users don't have update permission on their
// own profile row (intentionally, so they can't tamper with their plan).
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Give this function up to 5 minutes — large site generations can
// genuinely take a few minutes, and cutting it short leaves things
// stuck on "generating" with no error ever being recorded.
export const maxDuration = 300;

const LIMITS = {
  starter: { sites: 5, generations: 10 },
  growth: { sites: 20, generations: 40 },
  pro: { sites: 100, generations: 150 },
};

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  // ---- Plan + usage check ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, generations_used")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to generate sites." },
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

  const { count: siteCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (siteCount >= limit.sites) {
    return NextResponse.json(
      {
        error: "site_limit",
        message: `You've reached your ${limit.sites}-site limit for this plan. Upgrade for more.`,
      },
      { status: 402 }
    );
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
- IMPORTANT — vary the design every time: choose a color palette, font pairing, and layout style that fit THIS specific business and vibe described. Do not default to the same purple/dark theme or the same layout order every time — a bakery, a law firm, and an auto shop should look visibly different from each other. Pick colors and fonts appropriate to the industry and tone requested.
- Include a clear hero, a services/about section, a "why choose us" section, a "how it works" or process section (if relevant to the business), and a contact section at minimum.
- Keep CSS efficient and avoid unnecessary repetition, so the full page always finishes within the response.
- Use REAL photos, not just gradients/CSS shapes: pull images from https://loremflickr.com/900/600/<single-keyword> for the hero, gallery, and service sections. Use exactly ONE simple, common, popular keyword per image (e.g. /900/600/restaurant, /900/600/pizza, /900/600/car, /900/600/lawyer) — never combine multiple keywords with commas. Multi-keyword combinations often fail to match any real photo and silently fall back to a random unrelated stock image (including animals), which looks broken on a real client site. Pick the single most relevant, common keyword for each image placement, and vary the size per placement (e.g. /600/400 for smaller cards).
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

    // Only count it against their monthly limit once generation
    // actually succeeds. Uses the admin client since users don't have
    // update permission on their own profile row.
    await supabaseAdmin
      .from("profiles")
      .update({ generations_used: profile.generations_used + 1 })
      .eq("id", user.id);

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
