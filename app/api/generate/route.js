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

  const { clientName, prompt, photoUrls: rawPhotoUrls } = await req.json();
  const photoUrls = Array.isArray(rawPhotoUrls) ? rawPhotoUrls.filter(Boolean) : [];
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
            content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for a small local business website. This needs to look like a modern, award-worthy site — the kind that would win an "site of the day" award — not a generic template.

Client/business: "${clientName}"
Brief: "${prompt}"
${photoUrls.length > 0 ? `\nREAL PHOTOS PROVIDED — use these actual URLs for the business's real photos (hero, gallery, about section) instead of stock images: ${photoUrls.join(", ")}. These are real photos of this specific business, so feature them prominently — they matter far more than any stock photo.` : ""}

=== DESIGN — make this genuinely impressive ===
- Vary the design every time: pick a color palette, font pairing, and layout style that genuinely fit THIS specific business and vibe. Do not default to the same theme or section order every time — a bakery, a law firm, and an auto shop should look nothing alike.
- Use at least two font families (a bold display/heading font + a clean body font) via Google Fonts, picked to match the brand's personality.
- Push hard on modern, high-end visual techniques — pick whichever of these genuinely fit the business, and implement them for real, not just describe them:
  - Scroll-triggered reveal animations (elements fade/slide into view using IntersectionObserver as the user scrolls — not everything visible at once on load)
  - A subtle parallax effect on the hero (background moves slower than foreground on scroll)
  - An animated gradient mesh or drifting blurred color-orb background in the hero (like premium SaaS sites), built in pure CSS/JS
  - A horizontally scrolling marquee/ticker strip for things like service tags, certifications, or "as seen in" style trust badges
  - Animated counting-up statistics (years in business, jobs completed, etc. counting up from 0 when scrolled into view)
  - Magnetic or hover-tilt effects on buttons/cards (subtle transform following cursor position or a lift+glow on hover)
  - Glassmorphism cards (translucent, blurred backgrounds) for pricing/service cards where it fits the aesthetic
  - A sticky progress indicator or subtly animated nav bar that changes appearance on scroll
- Don't cram in every technique on every site — pick 3-5 that genuinely fit this business's vibe and execute them well, rather than using all of them shallowly.
- Make sure it's fully responsive: nothing should overflow or overlap on a ~375px mobile width. Disable or simplify heavy scroll/parallax effects on mobile if needed for performance.
- Respect prefers-reduced-motion — disable non-essential animations for users who have that OS setting on.
- Add a real <title> tag and a meta description tag with relevant copy for this business.

=== STRUCTURE (all required, in an order that makes sense for this business) ===
1. Sticky nav — business name/logo text, a few anchor links, and a phone number or "Call Now" / "Get a Quote" button
2. Hero — a strong, specific headline (not generic filler), a supporting subheadline, a clear call-to-action button, and a hero image or animated background
3. About/services — real, specific service descriptions for what THIS business actually does, based on the brief
4. "Why choose us" — 3-4 concrete differentiators specific to the business type
5. A process/"how it works" section OR a gallery/portfolio section — whichever fits better
6. Social proof — 2-3 short, realistic-sounding testimonials with names
7. A clear final call-to-action section before the footer
8. Footer — business name, plausible service area, contact info, copyright line

=== COPYWRITING ===
- Write real, specific, persuasive copy — headlines and body text should sound professionally written for this exact business, referencing details from the brief.
- Avoid generic filler like "we are dedicated to providing quality service." Be specific about what they do, for whom, and why choose them over a competitor.

=== IMAGES ===
${photoUrls.length > 0
  ? `- Use the real uploaded photo URLs listed above for the hero and key sections. Only fall back to stock images below for any additional supporting images beyond what was uploaded.`
  : ""}
- For any stock photos needed, pull from https://loremflickr.com/900/600/<single-keyword>. Use exactly ONE simple, common, popular keyword per image (e.g. /900/600/restaurant, /900/600/car, /900/600/lawyer) — never combine multiple keywords with commas, since combinations often fail to match and silently fall back to a random unrelated image. Vary the size per placement (e.g. /600/400 for smaller cards).
- If the business has a natural before/after angle (detailing, renovation, fitness, cleaning, landscaping, etc.), build a REAL functional before/after image comparison slider with a draggable handle controlling a clip-path. Make it actually work.

=== TECHNICAL RULES ===
- Output ONLY raw HTML, no markdown fences, no explanation before or after.
- All CSS in a single <style> tag, all JS in a single <script> tag, everything in one file (Google Fonts <link> tags are fine).
- Keep CSS/JS efficient so the full page finishes generating within the response — prioritize finishing a complete, working page over cramming in extra effects if space runs tight.`,
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
