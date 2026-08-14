import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { stripFakePhoneNumbers } from "@/lib/sanitize-site";

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

// Vercel's own runtime logs confirmed a genuinely detailed brief (a full
// multi-section storefront) can take longer than 200s to generate at this
// token budget — matching the authenticated /api/generate route's proven
// 300s ceiling rather than guessing at another number. This now bounds
// the background job (see waitUntil below), not the client's request,
// which returns almost immediately.
export const maxDuration = 300;

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

// Pexels' search is a keyword match, not a semantic one — feeding it a raw
// slice of the brief ("Create a modern, premium website for Mill Basin
// Shuk, a neighborhood grocery/food market serving...") returns nothing
// useful, because "create", "modern", "premium", "website", "serving" are
// noise words no real photo is tagged with. This shipped a site where
// every single image fell through to the random picsum fallback — the
// opposite of the one thing a photo search exists to do. Stripping
// instruction/mood words down to the actual content nouns turns that same
// brief into "mill basin shuk neighborhood grocery food market brooklyn
// community", which Pexels can actually match against.
const SEARCH_STOPWORDS = new Set([
  "a", "an", "the", "for", "and", "or", "but", "with", "without", "that", "this", "these",
  "those", "is", "are", "was", "were", "be", "been", "being", "to", "of", "on", "at", "by",
  "from", "as", "it", "its", "your", "their", "our", "we", "you", "they", "not", "no",
  "never", "use", "using", "create", "creates", "creating", "build", "building", "make",
  "making", "website", "site", "page", "pages", "modern", "premium", "clean", "sophisticated",
  "elegant", "upscale", "warm", "welcoming", "strong", "generic", "ai", "ai-generated",
  "design", "designed", "style", "overall", "every", "section", "sections", "background",
  "backgrounds", "text", "accent", "accents", "typography", "font", "fonts", "smooth",
  "animation", "animations", "fast", "understated", "mobile-first", "mobile", "fully",
  "responsive", "do", "should", "must", "will", "serving", "brings", "right", "heart", "in",
]);

function extractSearchTerms(clientName, prompt) {
  const words = `${clientName} ${prompt}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !SEARCH_STOPWORDS.has(w));
  const seen = new Set();
  const ordered = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    ordered.push(w);
    if (ordered.length >= 12) break;
  }
  return ordered.join(" ");
}

// Runs after the client already has its jobId back — this is the actual
// (slow, costly) generation, kept alive past the response via waitUntil
// so closing the tab that started it doesn't kill the work. Every path
// out of this function must write a final status to the job row, since
// nothing else is watching it complete.
async function runGeneration(jobId, clientName, prompt) {
  const stockPhotos = await searchStockPhotos(extractSearchTerms(clientName, prompt));

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 24000,
      messages: [
        {
          role: "user",
          content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for a small local business website. This needs to look like a modern, award-worthy site — the kind that would win a "site of the day" award — not a generic template. Hold it to the bar of a hand-crafted Lovable or v0 output: considered type hierarchy, generous and intentional whitespace, layout choices that feel designed for this specific brand rather than a Bootstrap-y stack of identical boxes.

Client/business: "${clientName}"
Brief: "${prompt}"
${stockPhotos.length > 0 ? `\nCURATED STOCK PHOTOS MATCHING THIS BUSINESS — real photos selected for this exact niche. Use ONLY these exact URLs for every photo on the page instead of any placeholder image service; do not invent or use any other image URL. Before placing any photo in a specific section (a category card, a service slot, etc.), check its alt-text description actually matches what that section is about — the search is not perfect and has shipped a photo completely unrelated to its slot before (e.g. a mountain highway photo labeled "Bakery"). If a photo's subject doesn't clearly fit a specific slot, reuse a photo that does fit elsewhere on the page instead of forcing a mismatched one in — a repeated photo is far less broken-looking than a wrong one:\n${stockPhotos.map((p) => `- ${p.url}${p.alt ? ` (${p.alt})` : ""}`).join("\n")}` : `\nNo curated photos matched this business — do NOT use picsum.photos, loremflickr.com, or any other random stock-photo service. A random photo next to a specific label (a highway shot labeled "Bakery") looks broken, which has shipped before and is worse than no photo at all. Instead, build every image slot as a deliberate flat placeholder: a solid or gradient panel using the site's own palette, with a large centered icon (a simple inline SVG line icon, or one relevant emoji at large size) and the slot's own label styled boldly. This should read as an intentional design choice, not a missing photo.`}

=== DESIGN — make this genuinely impressive ===
- Read the brief for its own design direction first. If it specifies colors, a palette, a mood or vibe (elegant, warm, minimal, upscale, rustic, corporate), specific fonts, or says anything like "don't make it look AI-generated" or "not futuristic" — that direction wins completely. Follow it as literally as a real client brief would demand: "elegant and warm, mostly white/cream, charcoal text, green or burgundy accents" means exactly that palette, not a dark reinterpretation of it with neon accents.
- Only when the brief gives no design direction of its own, default to the house style: futuristic/high-tech — a dark, near-black base (not pure #000) with one or two saturated neon/glow accent colors (electric blue, cyan, violet, magenta, acid green), glassmorphism, gradient meshes and drifting glow orbs, subtle grid/scanline textures, sharp geometric shapes.
- Use at least two font families via Google Fonts — a bold geometric/technical display font for the futuristic default, or whatever actually fits the brief's own direction instead (e.g. a refined serif or elegant humanist sans for an upscale, warm brief).
- Implement 2-3 real, working modern techniques that fit whichever direction applies: scroll-triggered reveal animations (with a timeout-based fallback so nothing stays permanently invisible), an animated gradient/orb or a subtler equivalent in the hero (sized with vw/vh, capped on mobile), animated counting-up statistics (triggered with a low IntersectionObserver threshold plus a ~1.5s timeout fallback).
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

    // A demo never has a real number, so any tel: link here is invented by
    // definition — and this is the page a prospect judges the product on.
    const sanitized = stripFakePhoneNumbers(code, null);
    if (sanitized.changed > 0) {
      console.warn(`Rewrote ${sanitized.changed} fabricated phone reference(s) in demo job ${jobId}`);
      code = sanitized.code;
    }

    await supabaseAdmin
      .from("demo_jobs")
      .update({ status: "done", code, completed_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (err) {
    console.error("Demo generation failed:", err.message);
    await supabaseAdmin
      .from("demo_jobs")
      .update({ status: "error", error: err.message, completed_at: new Date().toISOString() })
      .eq("id", jobId);
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

  const { data: job, error: insertError } = await supabaseAdmin
    .from("demo_jobs")
    .insert({ ip, client_name: clientName, status: "pending" })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Recorded now, not earlier — a validation error above never reaches
  // this line, so it never burns someone's daily quota for a failure
  // that was never their fault. From here on real tokens are about to
  // be spent, so it counts regardless of how generation turns out.
  await supabaseAdmin.from("demo_generations").insert({ ip });

  // The response below returns almost immediately; waitUntil keeps this
  // function alive in the background to actually finish the generation,
  // so closing the tab that started it doesn't cut the work off — the
  // result lands in demo_jobs either way, and /api/demo-status?jobId=
  // is how the client (or a later visit) finds out.
  waitUntil(runGeneration(job.id, clientName, prompt));

  return NextResponse.json({ jobId: job.id });
}
