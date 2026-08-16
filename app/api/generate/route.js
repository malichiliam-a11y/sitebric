import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { limitsFor, generationCost, MULTIPAGE_COST } from "@/lib/plans";
import { stripFakePhoneNumbers } from "@/lib/sanitize-site";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Real, topically-relevant stock photos for whatever this business actually
// is — a "sushi restaurant" gets sushi photos, not a random Picsum image
// that happens to be reliable but has nothing to do with the business.
// Picsum (used in the generated HTML as the fallback below) trades away
// relevance for reliability; this trades nothing away when it works, and
// silently falls back to Picsum when it can't (no key configured, rate
// limited, network error) so a broken/slow Pexels call never blocks a
// generation.
async function searchStockPhotos(query) {
  if (!process.env.PEXELS_API_KEY || !query) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
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
// noise words no real photo is tagged with. This shipped a real generation
// where every single image fell through to the random picsum fallback —
// the opposite of the one thing a photo search exists to do. Stripping
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

const SINGLE_PAGE_STRUCTURE = `=== STRUCTURE (all required, in an order that makes sense for this business) ===
1. Sticky nav — business name/logo text, a few anchor links, and a "Call Now" / "Get a Quote" button (see CONTACT & LOCATION below for what this actually links to)
2. Hero — a strong, specific headline (not generic filler), a supporting subheadline, a clear call-to-action button, and a hero image or animated background
3. About/services — real, specific service descriptions for what THIS business actually does, based on the brief
4. "Why choose us" — 3-4 concrete differentiators specific to the business type
5. A process/"how it works" section OR a gallery/portfolio section — whichever fits better
6. Social proof — 2-3 short, realistic-sounding testimonials with names
7. Contact/booking section — the real lead form and, if we have an address, the Google Maps embed (both specified in CONTACT & LOCATION below)
8. A clear final call-to-action section before the footer
9. Footer — business name, plausible service area, contact info, copyright line`;

// The multi-page build. Still exactly one HTML file — four page views live
// in that file and JS swaps which one is visible, so publishing, storage
// and the preview iframe all stay exactly as they are for a single-page
// site. To a visitor it behaves like a four-page site.
//
// Hash routing is what makes that work without breaking anything already
// relied on: the hash IS the page id, so the existing "no phone number"
// fallback of href="#contact" keeps working untouched — it just navigates
// to the contact page instead of scrolling down to a section.
//
// The reveal-animation rules below are the part most likely to ship
// broken. Elements inside a display:none page are zero-sized, so an
// IntersectionObserver never fires for them; without the re-run on page
// switch, every page except the landing one renders permanently blank.
const MULTIPAGE_STRUCTURE = `=== STRUCTURE — THIS IS A MULTI-PAGE SITE ===
Build FOUR separate pages inside ONE HTML file. Do not build a single long scrolling page.

How the pages work:
- Each page is a top-level container: <section class="page" id="home">, <section class="page" id="services">, <section class="page" id="about">, <section class="page" id="contact">. Use exactly these four ids.
- Only one page is visible at a time. CSS: .page { display: none; } .page.active { display: block; }
- The nav and the footer live OUTSIDE the four page containers so they appear on every page. Do not duplicate them inside each page.
- Navigation is hash-based: every nav link is href="#home", href="#services", href="#about" or href="#contact". Write a small router that runs on both 'DOMContentLoaded' and 'hashchange': read location.hash, strip the '#', default to 'home' when it's empty or doesn't match one of the four ids, then remove .active from every .page and add it to the matching one.
- This means any link anywhere on the site pointing to href="#contact" navigates to the contact page. That is intended — use it for every "Get a Quote" / "Book Now" style call to action.
- On every page switch: scroll to the top (window.scrollTo(0, 0)), update which nav link has an "active" style, and close the mobile nav menu if it's open. A visitor who taps "Services" on a phone and lands halfway down the page with the menu still covering the screen will think the site is broken.

CRITICAL — animations must be re-run on page switch:
- Scroll-reveal elements and count-up statistics on a hidden page will NEVER animate on their own. A display:none element has zero size, so an IntersectionObserver never fires for it, and the element stays stuck at opacity 0 forever. If you ignore this, three of the four pages render completely blank.
- So: wrap the reveal/counter setup in a function, and call it again every single time a page becomes active — after the .active class is applied, not before.
- Add a safety-net sweep as well, but scope it to what the visitor can actually see: a function that force-reveals every still-hidden element whose getBoundingClientRect().top is less than window.innerHeight + 100 (i.e. on screen or just below it), leaving anything further down alone. Run that sweep on a ~1.2s timeout after each page switch AND on scroll. Do NOT force-reveal the entire page on a timeout — that fires every animation at once on all four pages and throws away the scroll-reveal effect entirely, which makes a multi-page site look worse than a single-page one. The rule is: nothing on screen is ever blank, everything below the fold still animates in as you reach it.
- Counters: fire each one when its page becomes active, and guard it so it only ever counts up once (a flag on the element) — otherwise it restarts every time the visitor returns to that page.
- Simplest reliable approach, in this order: on page switch, disconnect and rebuild the observer for just the new page's elements, start the ~1.2s sweep timeout, and attach the scroll sweep. Elements already revealed keep their revealed state, so coming back to a page shows it instantly instead of re-animating.

What goes on each page (all required):

1. HOME (#home)
   - Hero — a strong, specific headline (not generic filler), a supporting subheadline, a clear call-to-action button, and a hero image or animated background
   - A short teaser of 3 core services as cards, each linking to href="#services"
   - "Why choose us" — 3-4 concrete differentiators specific to the business type
   - Social proof — 2-3 short, realistic-sounding testimonials with names
   - A clear final call-to-action block linking to href="#contact"

2. SERVICES (#services)
   - A page headline and short intro
   - Every service this business actually offers, based on the brief, each with its own real write-up of a few sentences — not one-line labels. This page must have genuinely more depth than the teaser cards on the home page; if it just repeats them, the whole feature is pointless.
   - A process / "how it works" section — the steps a customer goes through
   - A call-to-action block linking to href="#contact"

3. ABOUT (#about)
   - The business's story and what makes it different, written specifically from the brief
   - A gallery / portfolio section, or the team, or the service area — whichever genuinely fits this business
   - Trust signals: years in business, certifications, guarantees, areas served
   - A call-to-action block linking to href="#contact"

4. CONTACT (#contact)
   - A page headline and a short line inviting the visitor to get in touch
   - The real lead-capture form specified in CONTACT & LOCATION below
   - The Google Maps embed, if an address was provided
   - Contact details and plausible opening hours
   - This page is where every call-to-action on the site leads, so it must feel complete on its own — do not leave it as a bare form on an empty background.

Shared across all four pages:
- Sticky nav — business name/logo text, links to all four pages, and a "Call Now" / "Get a Quote" button (see CONTACT & LOCATION below for what this actually links to). The link for the page currently being viewed should be visibly styled as active.
- Footer — business name, plausible service area, contact info, links to the four pages, copyright line

BUDGET: four pages of real content is a lot of output. Share one stylesheet across all pages rather than writing per-page CSS, reuse the same card and section components, and pick fewer animation techniques than you would for a one-page site. A complete four-page site with plainer effects is the goal; an elaborate site that gets cut off mid-page is a failure.`;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  // Read before the usage check below, not after: a multi-page build costs
  // more than one generation, so the allowance check can't run until we
  // know which kind of site was asked for.
  const {
    clientName,
    prompt,
    photoUrls: rawPhotoUrls,
    phone: rawPhone,
    address: rawAddress,
    ownerEmail: rawOwnerEmail,
    calendlyUrl: rawCalendlyUrl,
    multiPage: rawMultiPage,
  } = await req.json();
  const photoUrls = Array.isArray(rawPhotoUrls) ? rawPhotoUrls.filter(Boolean) : [];
  const phone = typeof rawPhone === "string" ? rawPhone.trim().slice(0, 40) : "";
  const address = typeof rawAddress === "string" ? rawAddress.trim().slice(0, 300) : "";
  const ownerEmail = typeof rawOwnerEmail === "string" ? rawOwnerEmail.trim().slice(0, 200) : "";
  const calendlyUrl = typeof rawCalendlyUrl === "string" ? rawCalendlyUrl.trim().slice(0, 300) : "";
  const multiPage = rawMultiPage === true;
  const cost = generationCost(multiPage);
  if (!clientName || !prompt) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
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

  const limit = limitsFor(plan);
  const remaining = limit.generations - profile.generations_used;
  if (remaining < cost) {
    // Two different situations reach this branch and they need different
    // wording: out of generations entirely, versus having some left but
    // not the 3 a multi-page build costs. Telling someone with 2 left
    // that they've "used all 10" reads as a bug.
    let message;
    if (remaining <= 0) {
      message =
        plan === "trial"
          ? "You've used your free trial generations. Subscribe to a plan to keep building."
          : `You've used all ${limit.generations} generations for this month. Upgrade for more.`;
    } else {
      message = `A multi-page site uses ${MULTIPAGE_COST} generations and you have ${remaining} left this month. Generate a single-page site instead, or upgrade for more.`;
    }
    // remaining is sent so the dashboard can tell the two cases apart:
    // genuinely out of generations means send them to /pricing, whereas
    // having some left but not enough for a multi-page build just needs
    // the message shown inline so they can untick the box.
    return NextResponse.json(
      { error: "generation_limit", message, remaining: Math.max(0, remaining) },
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

  // Only bother searching when there's no real photo of the business
  // itself — an uploaded real photo always beats a stock one.
  const stockPhotos =
    photoUrls.length === 0 ? await searchStockPhotos(extractSearchTerms(clientName, prompt)) : [];

  // Create the row first so the dashboard can show a "generating" state,
  // and so the generated page's lead form has a real project id to POST
  // to (see the CONTACT & LOCATION prompt section below).
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      client_name: clientName,
      prompt,
      status: "generating",
      phone: phone || null,
      address: address || null,
      owner_email: ownerEmail || null,
      calendly_url: calendlyUrl || null,
      multi_page: multiPage,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    // Streamed, not a single buffered request. A 32k-token generation runs
    // well past the point where a non-streaming HTTP call times out — the
    // connection dies mid-generation and the browser reports a bare "Load
    // failed" with no server error to show. Streaming keeps bytes flowing
    // so neither the SDK nor any intermediary treats it as a stalled
    // request; .finalMessage() still hands back the whole response.
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 64000,
      messages: [
        {
          role: "user",
          content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for ${multiPage ? "a FOUR-PAGE small local business website (four page views inside that one file — see STRUCTURE)" : "a small local business website"}. This needs to look like a modern, award-worthy site — the kind that would win an "site of the day" award — not a generic template. Hold it to the bar of a hand-crafted Lovable or v0 output: considered type hierarchy, generous and intentional whitespace, layout choices that feel designed for this specific brand rather than a Bootstrap-y stack of identical boxes. Every section should look like a decision was made about it.

Client/business: "${clientName}"
Brief: "${prompt}"
${photoUrls.length > 0 ? `\nREAL PHOTOS PROVIDED — use these actual URLs for the business's real photos (hero, gallery, about section) instead of stock images: ${photoUrls.join(", ")}. These are real photos of this specific business, so feature them prominently — they matter far more than any stock photo.` : ""}
${stockPhotos.length > 0 ? `\nCURATED STOCK PHOTOS MATCHING THIS BUSINESS — real photos selected for this exact niche, not generic stock. Use ONLY these exact URLs for every photo on the page (hero, gallery, about, service cards) instead of any placeholder image service; do not invent or use any other image URL. Pick whichever ones best fit each section and crop with object-fit: cover as needed:\n${stockPhotos.map((p) => `- ${p.url}${p.alt ? ` (${p.alt})` : ""}`).join("\n")}` : ""}

=== DESIGN — make this genuinely impressive ===
- Read the brief for its own design direction FIRST, before anything below. If it specifies particular colors, a stated palette, a mood or vibe (elegant, warm, minimal, upscale, rustic, corporate, premium-but-approachable), specific fonts, or says anything like "don't make it look AI-generated" or "not futuristic" — that direction wins completely and everything below about the futuristic house style does not apply. Follow the brief as literally as a real paying client's brief would demand: "mostly white/cream backgrounds, deep charcoal text, subtle green or burgundy accents, elegant typography" means exactly that light, warm palette — never a dark reinterpretation of it with neon glow, glassmorphism, or a "futuristic" spin the brief didn't ask for. This has shipped wrong before: a detailed brief explicitly requesting a warm, light, non-AI-generated look still came back dark with neon cyan accents because the house style below was treated as a mandate instead of a fallback.
- Only when the brief gives no design direction of its own (no colors, no mood words, no explicit style ask), default to the house style: futuristic/high-tech — dark, sleek, glowing, a step ahead of a typical small-business site. Within that default, still vary the palette, specific accent colors, and layout per business so a bakery, a law firm, and an auto shop don't look identical — a bakery's futuristic take might lean warm neon (amber/rose glow on near-black), a locksmith's might lean cold cyber (electric blue/cyan on near-black) — but the underlying tech-forward feel should be consistent. Do not default to the same layout or section order every time.
- When using the futuristic default: a dark, near-black base (not pure #000 — a deep charcoal/navy/graphite reads more premium) with one or two saturated neon/glow accent colors (electric blue, cyan, violet, magenta, acid green — pick what fits the brand) used for highlights, glows, and CTAs against it; glassmorphism (translucent frosted-glass cards with backdrop-filter blur and a thin glowing 1px border), gradient meshes and drifting glow orbs, subtle grid/circuit-line/scanline background textures, holographic or iridescent gradient washes on accents, sharp geometric shapes and angular clip-paths rather than soft rounded skeuomorphic ones.
- When following an explicit brief direction instead, use whatever visual language actually fits it — soft shadows instead of glow, generous whitespace, refined or classic typography, rounded-but-not-glassy cards — and treat the futuristic motifs above as off-limits for that site.
- Use at least two font families via Google Fonts. For the futuristic default: a bold, geometric/technical display font (e.g. Space Grotesk, Sora, Orbitron) plus a clean geometric sans body font. For an explicit brief direction: whatever fonts actually fit it — a refined serif or elegant humanist sans reads right for an upscale/warm brief, a tech-forward sans reads wrong for one that explicitly isn't supposed to look futuristic.
- Push hard on modern, high-end visual techniques — pick whichever of these genuinely fit the business, and implement them for real, not just describe them:
  - Scroll-triggered reveal animations (elements fade/slide into view using IntersectionObserver as the user scrolls — not everything visible at once on load). This has shipped broken before: later elements (a 4th step in a process list, testimonials further down the page) stay stuck at opacity 0 forever because the observer never fires for them on some viewports. Use a low threshold (0.1-0.15), and — critically — after attaching the observer, also add a single safety net: a scroll or load-triggered check (or a several-second timeout) that force-reveals ANY element still unrevealed, so nothing can end up permanently invisible. A visitor should never see a blank gap where content should be.
  - A subtle parallax effect on the hero (background moves slower than foreground on scroll)
  - An animated gradient mesh or drifting blurred color-orb background in the hero (like premium SaaS sites), built in pure CSS/JS. Size these relative to the viewport (vw/vh or clamp()), not fixed pixels — an orb sized to be a tasteful accent on a 1440px desktop (e.g. 500px wide) is bigger than the entire screen on a 390px phone, so instead of a subtle glow it floods the whole viewport with solid color. Cap orb size at a fraction of 100vw on mobile (a media query is fine) so it stays a subtle accent at every width.
  - A horizontally scrolling marquee/ticker strip for things like service tags, certifications, or "as seen in" style trust badges
  - Animated counting-up statistics (years in business, jobs completed, etc. counting up from 0 when scrolled into view) — trigger each counter off its own element (or a small stats row) with a low IntersectionObserver threshold like 0.1-0.2, never 0.5+ on a large wrapping section, since a tall hero on a short/mobile viewport (or a scaled-down preview) can permanently fail to cross a high threshold and leave the numbers stuck at 0. Always add a ~1.5s setTimeout fallback that fires the count-up regardless of whether the observer ever fired — a stat frozen at 0 is worse than one that animates without a scroll trigger.
  - Magnetic or hover-tilt effects on buttons/cards (subtle transform following cursor position or a lift+glow on hover)
  - Glassmorphism cards (translucent, blurred backgrounds) for pricing/service cards where it fits the aesthetic
  - A sticky progress indicator or subtly animated nav bar that changes appearance on scroll
- Don't cram in every technique on every site — pick 3-5 that genuinely fit this business's vibe and execute them well, rather than using all of them shallowly.
- Make sure it's fully responsive: nothing should overflow or overlap on a ~375px mobile width. Disable or simplify heavy scroll/parallax effects on mobile if needed for performance.
- Test your hero mentally against a landscape phone (a short viewport, ~390-430px tall, not just narrow) — not just a portrait one. A hero sized with large display-font headlines plus min-height: 100vh can end up 700px+ tall, meaning a visitor in landscape has to scroll almost two full screens just to reach the call-to-action button, which reads as broken even though nothing is technically lost. Add an "@media (max-height: 500px) and (orientation: landscape)" rule that shrinks the hero's heading font-size, vertical padding, and min-height so the CTA is reachable within roughly one screen.
- Respect prefers-reduced-motion — disable non-essential animations for users who have that OS setting on.
- Add a real <title> tag and a meta description tag with relevant copy for this business.
- REQUIRED, first thing in <head>: <meta name="viewport" content="width=device-width, initial-scale=1">. Without this exact tag, mobile Safari and Chrome ignore all responsive CSS and render the page at a fake ~980px desktop width, shrunk to fit — that's what makes a page "not fit" on a phone even when the CSS itself is correct.

${multiPage ? MULTIPAGE_STRUCTURE : SINGLE_PAGE_STRUCTURE}

=== COPYWRITING ===
- Write real, specific, persuasive copy — headlines and body text should sound professionally written for this exact business, referencing details from the brief.
- Avoid generic filler like "we are dedicated to providing quality service." Be specific about what they do, for whom, and why choose them over a competitor.
- Any invented stat must be plausible for its own scale — this has shipped wrong before (a "9★ Google Rating" badge, which is impossible since Google ratings max out at 5.0). Star ratings: 0-5 only, one decimal (e.g. 4.8 or 4.9, never a round 5.0 — reads as fake). Percentages: 0-100. Sanity-check every number against what it claims to measure before writing it.
- If a stat uses the animated counter pattern (a <span class="counter" data-target="..."> that JS counts up on scroll) for a decimal value like a rating, data-target must be the FULL decimal number (e.g. data-target="4.8") with data-decimal="1", and nothing else may be concatenated after the span. This has shipped wrong before: data-target="4" with a literal ".8★" typed after the span, which rendered as the broken "4.0.8★" once the counter animated to "4.0". Never split a decimal value between the counter's data-target and hand-typed text outside it.

=== CONTACT & LOCATION — real data only, never invent fake info ===
${phone
  ? `- Real phone number: "${phone}". Use this EXACT number for every "Call Now" link and everywhere the phone number is displayed in text. Never invent a placeholder number like (555) 123-4567. This page can be viewed either standalone or embedded in a sandboxed preview iframe, and sandboxed iframes unreliably block tel: navigation (especially in Safari) even with permissive sandbox attributes — so every "Call Now" link needs a fallback that works either way. Use exactly this pattern for every one of them: <a href="tel:${phone.replace(/[^\d+]/g, "")}" onclick="if(window.parent!==window){event.preventDefault();window.parent.postMessage({type:'sitebric-tel',href:this.href},'*');}">Call Now</a> — keep the real href so it still works standalone, and the onclick only kicks in when the page is actually embedded in a parent frame.`
  : `- No phone number was provided — do NOT invent a fake one. Every "Call Now" style button must instead be a real anchor link (href="#contact") that scrolls down to the contact section, never a fake tel: link to a made-up number.`}
${address
  ? `- Real business address: "${address}". Include a "Find us" section with a real, working embedded Google Map — an <iframe> with src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed" (no API key needed, this works standalone), width="100%", height around 350-450px, and loading="lazy". Next to it, a "Get Directions" link to href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" with target="_blank" rel="noopener".`
  : `- No address was provided — do not invent one. Skip the Google Maps section entirely rather than showing a fake or placeholder location.`}
- Build one real, working lead-capture form (name, phone or email, and a short "what do you need" message field) using plain HTML and vanilla JS fetch — no decorative "Submit" button that does nothing when clicked. On submit (with e.preventDefault()), POST JSON to "https://sitebric.com/api/site-lead" with header "Content-Type: application/json" and body {"projectId": "${project.id}", "name": <the name field value>, "contact": <the phone/email field value>, "message": <the message field value>}. While the request is in flight, disable the submit button and show a "Sending..." state. On a successful response, replace the form with a real confirmation message ("Thanks — we'll be in touch soon."). On a failed request, show an inline error message and leave what the visitor typed intact so they don't have to retype it.
${calendlyUrl
  ? `- A real scheduling link was provided: "${calendlyUrl}". Make the primary "Book a meeting" / "Schedule a call" call-to-action a genuine link to this exact URL with target="_blank" rel="noopener" — place it prominently near the lead form, not instead of it. Both the scheduling link and the lead form should be present and both should work.`
  : `- No scheduling link was provided, so "Book a meeting" style copy should point at the lead form above (e.g. an anchor link to #contact) rather than a fake calendar widget.`}

=== IMAGES ===
${photoUrls.length > 0
  ? `- Use the real uploaded photo URLs listed above for the hero and key sections. Only fall back to stock images below for any additional supporting images beyond what was uploaded.`
  : ""}
${stockPhotos.length > 0
  ? `- Use ONLY the curated stock photo URLs listed above — they were picked to actually match this business's niche. Do not use picsum.photos, loremflickr.com, or any other placeholder image service. Before placing any of these photos in a specific section (a named service card, a before/after slot, etc.), check its alt-text description actually matches what that section is about — the search that found these photos is not perfect, and it has shipped photos completely unrelated to their slot before (e.g. a coffee-meeting stock photo dropped onto a "Fence & Exterior Cleaning" card). If a photo's subject doesn't clearly fit a specific slot, reuse a photo that does fit elsewhere on the page instead of forcing a mismatched one in — a repeated photo is far less broken-looking than a wrong one.`
  : `- No curated photos matched this business — do NOT use picsum.photos, loremflickr.com, or any other random stock-photo service. A random photo next to a specific label (a highway shot on a "Bakery" card) looks broken, which has shipped to a real client site before and is worse than no photo at all. Instead, build every image slot as a deliberate flat placeholder: a solid or gradient panel using the site's own palette, with a large centered icon (a simple inline SVG line icon, or one relevant emoji at large size) and the slot's own label styled boldly. This should read as an intentional design choice, not a missing photo.`}
- If the business has a natural before/after angle (detailing, renovation, fitness, cleaning, landscaping, etc.) AND real uploaded before/after photos of an actual job were provided above, build a REAL functional before/after image comparison slider with a draggable handle controlling a clip-path, using those real photos. This has shipped badly broken when built with stock/placeholder photos instead — two unrelated stock photos (e.g. an American flag "before" turning into a turf field "after") can never depict the same job before and after, so it looks like a mistake rather than a feature. Without real before/after photos of an actual job, skip the before/after slider entirely — do not fake one with stock or placeholder images.

=== TECHNICAL RULES ===
- Output ONLY raw HTML, no markdown fences, no explanation before or after.
- All CSS in a single <style> tag, all JS in a single <script> tag, everything in one file (Google Fonts <link> tags are fine).
- Keep CSS/JS efficient so the full page finishes generating within the response — prioritize finishing a complete, working page over cramming in extra effects if space runs tight.`,
          },
      ],
    });

    // The SDK raises typed errors for a non-2xx, so there is no status to
    // branch on here — the catch below records the failure.
    const data = await stream.finalMessage();

    let code = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/^```(html)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // A truncated generation is a broken site, not a site — better to fail
    // loudly than to publish half a page.
    if (data.stop_reason === "max_tokens") {
      throw new Error(
        multiPage
          ? "The four-page site came out longer than the size limit. Try a shorter brief, or generate it as a single-page site."
          : "The site came out longer than the size limit. Try a shorter brief."
      );
    }

    if (!code) throw new Error("empty response from model");

    // The prompt forbids invented phone numbers and the model usually obeys,
    // but four sites still shipped with a Call Now button dialling
    // 555-123-4567 — one of them published for a real business. Enforced
    // here rather than trusted upstream.
    const sanitized = stripFakePhoneNumbers(code, phone);
    if (sanitized.changed > 0) {
      console.warn(
        `Rewrote ${sanitized.changed} fabricated phone reference(s) in project ${project.id}`
      );
      code = sanitized.code;
    }

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
    //
    // A multi-page build costs more than one because it burns roughly
    // three times the output tokens; a failed one costs nothing, same as
    // a failed single-page build.
    await supabaseAdmin
      .from("profiles")
      .update({ generations_used: profile.generations_used + cost })
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
