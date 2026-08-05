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
  trial: { sites: 2, generations: 2 },
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
  let { data: profile } = await supabase
    .from("profiles")
    .select("plan, generations_used")
    .eq("id", user.id)
    .single();

  // Brand new users have no profile row at all yet (one only gets
  // created today via Stripe checkout) — give them a free trial row
  // instead of blocking them immediately.
  if (!profile) {
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan: "trial",
      generations_used: 0,
    });
    profile = { plan: "trial", generations_used: 0 };
  }

  const plan = profile.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to generate sites." },
      { status: 402 }
    );
  }

  const limit = LIMITS[plan];
  if (profile.generations_used >= limit.generations) {
    const message =
      plan === "trial"
        ? "You've used your free trial generation. Subscribe to a plan to keep building."
        : `You've used all ${limit.generations} generations for this month. Upgrade for more.`;
    return NextResponse.json({ error: "generation_limit", message }, { status: 402 });
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
            content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for a small local business website. This needs to look like something a real design agency charged $2,000+ for — not a template, not a placeholder.

Client/business: "${clientName}"
Brief: "${prompt}"

=== DESIGN ===
- Vary the design every time: pick a color palette, font pairing, and layout style that genuinely fit THIS specific business and vibe. Do not default to the same purple/dark theme or the same section order every time — a bakery, a law firm, and an auto shop should look nothing alike. Choose colors and typography appropriate to the industry, tone, and audience implied by the brief.
- Use at least two font families (a display/heading font + a body font) via Google Fonts, picked to match the brand's personality (e.g. a serif for a law firm, a bold rounded sans for a bakery, a sharp technical sans for an auto shop).
- Add real visual polish: subtle shadows, hover states on buttons/cards, smooth scroll behavior, a sticky/blurred nav bar, and at least one tasteful CSS animation or transition (fade-in on scroll, hover lift on cards, etc.) — implemented with plain CSS/JS, no external animation libraries.
- Make sure it's fully responsive: test your layout mentally at mobile widths (~375px) as well as desktop — stack columns, adjust font sizes with clamp(), and make sure nothing overflows or overlaps on a phone screen.
- Add a favicon-less <title> tag and a meta description tag with real, relevant copy for this business (basic on-page SEO).

=== STRUCTURE (all required, in an order that makes sense for this business) ===
1. Sticky nav — business name/logo text, a few anchor links to sections, and a phone number or "Call Now" / "Get a Quote" button
2. Hero — a strong, specific headline (not generic filler like "Welcome to our business"), a supporting subheadline, a clear call-to-action button, and a hero image
3. About/services — real, specific service descriptions for what THIS business actually does, based on the brief — not vague placeholder text
4. "Why choose us" — 3-4 concrete differentiators (specific to the business type, e.g. licensed & insured for a locksmith, same-day service for a plumber)
5. A process/"how it works" section OR a gallery/portfolio section — whichever fits the business better
6. Social proof — at least 2-3 short testimonial blocks with realistic customer names and specific, believable quotes (not "Great service! - John D." — make them sound like a real customer wrote them, mentioning specifics)
7. A clear final call-to-action section before the footer
8. Footer — business name, a plausible service area/city, contact info, and copyright line

=== COPYWRITING ===
- Write real, specific, persuasive copy throughout — headlines and body text should sound like a professional copywriter wrote them for this exact business, referencing details from the brief (services, location, vibe) wherever possible.
- Avoid generic filler phrases like "we are dedicated to providing quality service." Be specific: what exactly do they do, for whom, and why should someone choose them over a competitor.

=== IMAGES ===
- Use REAL photos, not just gradients/CSS shapes: pull images from https://loremflickr.com/900/600/<single-keyword> for the hero, gallery, and service sections. Use exactly ONE simple, common, popular keyword per image (e.g. /900/600/restaurant, /900/600/pizza, /900/600/car, /900/600/lawyer) — never combine multiple keywords with commas. Multi-keyword combinations often fail to match any real photo and silently fall back to a random unrelated stock image (including animals), which looks broken on a real client site. Pick the single most relevant, common keyword for each image placement, and vary the size per placement (e.g. /600/400 for smaller cards).
- If the business has a natural before/after angle (detailing, renovation, fitness, cleaning, landscaping, etc.), build a REAL functional before/after image comparison slider: two stacked images, a draggable handle (range input or mouse/touch drag) controlling a clip-path to reveal one image over the other. Make it actually work, not decorative.

=== TECHNICAL RULES ===
- Output ONLY raw HTML, no markdown fences, no explanation before or after.
- All CSS in a single <style> tag, all JS in a single <script> tag, everything in one file (Google Fonts <link> tags are fine).
- Keep CSS efficient and avoid unnecessary repetition, so the full page always finishes generating within the response — prioritize finishing a complete, working page over adding extra sections if space runs tight.`,
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
