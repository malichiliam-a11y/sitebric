import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { limitsFor } from "@/lib/plans";

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

  const limit = limitsFor(plan);
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

  const {
    clientName,
    prompt,
    photoUrls: rawPhotoUrls,
    phone: rawPhone,
    address: rawAddress,
    ownerEmail: rawOwnerEmail,
    calendlyUrl: rawCalendlyUrl,
  } = await req.json();
  const photoUrls = Array.isArray(rawPhotoUrls) ? rawPhotoUrls.filter(Boolean) : [];
  const phone = typeof rawPhone === "string" ? rawPhone.trim().slice(0, 40) : "";
  const address = typeof rawAddress === "string" ? rawAddress.trim().slice(0, 300) : "";
  const ownerEmail = typeof rawOwnerEmail === "string" ? rawOwnerEmail.trim().slice(0, 200) : "";
  const calendlyUrl = typeof rawCalendlyUrl === "string" ? rawCalendlyUrl.trim().slice(0, 300) : "";
  if (!clientName || !prompt) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

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
      max_tokens: 32000,
      messages: [
        {
          role: "user",
          content: `Generate a COMPLETE, SELF-CONTAINED, production-quality single HTML file for a small local business website. This needs to look like a modern, award-worthy site — the kind that would win an "site of the day" award — not a generic template. Hold it to the bar of a hand-crafted Lovable or v0 output: considered type hierarchy, generous and intentional whitespace, layout choices that feel designed for this specific brand rather than a Bootstrap-y stack of identical boxes. Every section should look like a decision was made about it.

Client/business: "${clientName}"
Brief: "${prompt}"
${photoUrls.length > 0 ? `\nREAL PHOTOS PROVIDED — use these actual URLs for the business's real photos (hero, gallery, about section) instead of stock images: ${photoUrls.join(", ")}. These are real photos of this specific business, so feature them prominently — they matter far more than any stock photo.` : ""}

=== DESIGN — make this genuinely impressive ===
- Vary the design every time: pick a color palette, font pairing, and layout style that genuinely fit THIS specific business and vibe. Do not default to the same theme or section order every time — a bakery, a law firm, and an auto shop should look nothing alike.
- Use at least two font families (a bold display/heading font + a clean body font) via Google Fonts, picked to match the brand's personality.
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

=== STRUCTURE (all required, in an order that makes sense for this business) ===
1. Sticky nav — business name/logo text, a few anchor links, and a "Call Now" / "Get a Quote" button (see CONTACT & LOCATION below for what this actually links to)
2. Hero — a strong, specific headline (not generic filler), a supporting subheadline, a clear call-to-action button, and a hero image or animated background
3. About/services — real, specific service descriptions for what THIS business actually does, based on the brief
4. "Why choose us" — 3-4 concrete differentiators specific to the business type
5. A process/"how it works" section OR a gallery/portfolio section — whichever fits better
6. Social proof — 2-3 short, realistic-sounding testimonials with names
7. Contact/booking section — the real lead form and, if we have an address, the Google Maps embed (both specified in CONTACT & LOCATION below)
8. A clear final call-to-action section before the footer
9. Footer — business name, plausible service area, contact info, copyright line

=== COPYWRITING ===
- Write real, specific, persuasive copy — headlines and body text should sound professionally written for this exact business, referencing details from the brief.
- Avoid generic filler like "we are dedicated to providing quality service." Be specific about what they do, for whom, and why choose them over a competitor.
- Any invented stat must be plausible for its own scale — this has shipped wrong before (a "9★ Google Rating" badge, which is impossible since Google ratings max out at 5.0). Star ratings: 0-5 only, one decimal (e.g. 4.8 or 4.9, never a round 5.0 — reads as fake). Percentages: 0-100. Sanity-check every number against what it claims to measure before writing it.

=== CONTACT & LOCATION — real data only, never invent fake info ===
${phone
  ? `- Real phone number: "${phone}". Use this EXACT number for every "Call Now" link (an <a href="tel:${phone.replace(/[^\d+]/g, "")}"> tag) and everywhere the phone number is displayed in text. Never invent a placeholder number like (555) 123-4567.`
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
- For any stock photos needed, pull from https://loremflickr.com/900/600/<single-keyword>. Use exactly ONE simple, common, popular keyword per image (e.g. /900/600/restaurant, /900/600/car, /900/600/lawyer) — never combine multiple keywords with commas, since combinations often fail to match and silently fall back to a random unrelated image. Vary the size per placement (e.g. /600/400 for smaller cards).
- If the business has a natural before/after angle (detailing, renovation, fitness, cleaning, landscaping, etc.), build a REAL functional before/after image comparison slider with a draggable handle controlling a clip-path. Make it actually work.

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
      throw new Error("The site came out longer than the size limit. Try a shorter brief.");
    }

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
