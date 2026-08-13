import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// This route has no login and no plan check behind it, so it's the one
// place in the app a stranger can trigger a real (costly) generation —
// rate limiting by IP is the only thing standing between this and an
// open spigot on the Anthropic bill.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_PER_DAY = 3;

// A real visitor's brief can be as detailed as anything typed into the
// authenticated generator — this isn't reliably a quick one-liner just
// because it's public. 120s still wasn't enough for a genuinely detailed
// prompt (multiple sections, a full storefront layout); the function got
// killed mid-generation and the connection dropping shows up in the
// browser as a bare "Load failed". The authenticated /api/generate route
// already proves 300s works fine on this Vercel plan.
export const maxDuration = 200;

async function searchStockPhotos(query) {
  if (!process.env.PEXELS_API_KEY || !query) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || [])
      .map((p) => ({ url: p.src?.large2x || p.src?.large, alt: p.alt || "" }))
      .filter((p) => p.url);
  } catch {
    return [];
  }
}

export async function POST(req) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0].trim() || "unknown";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("demo_generations")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);

  if ((count || 0) >= MAX_PER_DAY) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "You've used your free demo generations for today. Sign up free for unlimited ones.",
      },
      { status: 429 }
    );
  }

  const { clientName: rawClientName, prompt: rawPrompt } = await req.json().catch(() => ({}));
  const clientName = typeof rawClientName === "string" ? rawClientName.trim().slice(0, 100) : "";
  // 300 was chopping real briefs off mid-sentence — visitors paste
  // genuinely detailed specs here, not just a one-line description.
  const prompt = typeof rawPrompt === "string" ? rawPrompt.trim().slice(0, 2000) : "";

  if (!clientName || !prompt) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const stockPhotos = await searchStockPhotos(`${clientName} ${prompt}`.slice(0, 150));

  try {
    // Recorded right before the real (costly) Anthropic call, not at the
    // top of the request — a validation error or a route bug (like the
    // timeout that was too short before this) never touches Anthropic at
    // all, so it shouldn't burn someone's daily quota for a failure that
    // was never their fault. Once this line runs, real tokens are about
    // to be spent, so it counts against the cap regardless of how the
    // call below turns out.
    await supabaseAdmin.from("demo_generations").insert({ ip });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 24000,
      messages: [
        {
          role: "user",
          content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for a small local business website. This needs to look like a modern, award-worthy site — the kind that would win a "site of the day" award — not a generic template. Hold it to the bar of a hand-crafted Lovable or v0 output: considered type hierarchy, generous and intentional whitespace, layout choices that feel designed for this specific brand rather than a Bootstrap-y stack of identical boxes.

Client/business: "${clientName}"
Brief: "${prompt}"
${stockPhotos.length > 0 ? `\nCURATED STOCK PHOTOS MATCHING THIS BUSINESS — real photos selected for this exact niche. Use ONLY these exact URLs for every photo on the page instead of any placeholder image service; do not invent or use any other image URL. Pick whichever ones best fit each section:\n${stockPhotos.map((p) => `- ${p.url}${p.alt ? ` (${p.alt})` : ""}`).join("\n")}` : `\nNo curated photos are available — pull stock images from https://picsum.photos/seed/<unique-seed>/900/600, a distinct seed per image slot.`}

=== DESIGN — make this genuinely impressive, and lean futuristic ===
- The house visual language is futuristic/high-tech — dark, sleek, glowing. Default to a dark, near-black base (not pure #000) with one or two saturated neon/glow accent colors (electric blue, cyan, violet, magenta, acid green — pick what fits the brand) used for highlights, glows, and CTAs.
- Favor glassmorphism, gradient meshes and drifting glow orbs, subtle grid/scanline textures, sharp geometric shapes.
- Use at least two font families via Google Fonts (a bold geometric/technical display font plus a clean sans body font).
- Implement 2-3 real, working modern techniques: scroll-triggered reveal animations (with a timeout-based fallback so nothing stays permanently invisible), an animated gradient mesh/orb in the hero (sized with vw/vh, capped on mobile), animated counting-up statistics (triggered with a low IntersectionObserver threshold plus a ~1.5s timeout fallback).
- Fully responsive, nothing overflows at ~375px width. Respect prefers-reduced-motion.
- REQUIRED, first thing in <head>: <meta name="viewport" content="width=device-width, initial-scale=1">.
- Add a real <title> and meta description.

=== STRUCTURE ===
1. Sticky nav — business name, a few anchor links, a CTA button that scrolls to the contact section
2. Hero — a strong, specific headline, supporting subheadline, CTA button, hero image or animated background
3. About/services — real, specific service descriptions for what THIS business does, based on the brief
4. "Why choose us" — 3-4 concrete differentiators
5. A process or gallery section
6. Social proof — 2-3 short realistic testimonials with names
7. A contact section (see below)
8. Footer — business name, plausible service area, copyright line

=== COPYWRITING ===
- Write real, specific, persuasive copy referencing details from the brief — never generic filler.
- Any invented stat must be plausible (star ratings 0-5 with one decimal, never a round 5.0; percentages 0-100).
- If using the animated counter pattern for a decimal (e.g. a rating), data-target must be the FULL decimal (e.g. data-target="4.8") with nothing concatenated after the span.

=== CONTACT SECTION — this is a live public demo, not a real client's site ===
- No real phone number or address exists for this preview, so do not invent one — the CTA/"Call Now" style buttons should be anchor links to the contact section, not fake tel: links, and skip any Google Maps embed.
- Build a visually real, complete contact/lead form (name, phone or email, message) with plain HTML and vanilla JS. On submit (e.preventDefault()), do NOT send the data anywhere — there's no backend behind this preview. Instead show a message in place of the form: "🔒 This is a live preview — sign up free to make this form actually collect leads." Style that message to look intentional, not like an error.

=== TECHNICAL RULES ===
- Output ONLY raw HTML, no markdown fences, no explanation before or after.
- All CSS in a single <style> tag, all JS in a single <script> tag, everything in one file.
- Keep this efficient enough to finish generating well within the token budget — prioritize a complete, working page over cramming in extra effects.`,
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

    if (data.stop_reason === "max_tokens") {
      throw new Error("The site came out longer than the demo's size limit. Try a shorter description.");
    }
    if (!code) throw new Error("empty response from model");

    return NextResponse.json({ code });
  } catch (err) {
    console.error("Demo generation failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
