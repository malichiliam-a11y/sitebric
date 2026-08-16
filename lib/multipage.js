// Multi-page generation, split across parallel model calls.
//
// The single-call version could not work: four pages is roughly five
// minutes of streaming and /api/generate is capped at 300 seconds, so the
// function was killed with the site written but unsaved. Output is billed
// when it is generated, so every attempt cost real money and delivered
// nothing.
//
// So the work is split. One call produces the shared shell only — head,
// CSS, nav, footer — and all four pages are then generated concurrently
// against that CSS, so total wall time is about two page-times instead of
// four.
//
// The home page is deliberately NOT in the shell call. It was, once, and
// that call hit its token cap and was discarded mid-write: a whole site's
// CSS plus a full page of content does not fit in one response, and the
// truncated output is billed like any other. Keeping the shell to the
// shared furniture keeps it comfortably inside its budget.
//
// The behaviour is not asked for at all. The router, the scroll-reveal
// handling and the count-up statistics are written here, once, from an
// implementation verified in a browser across desktop, portrait and
// landscape viewports. The model writes content and CSS; every moving
// part is ours. That removes the failure this feature is most prone to —
// elements inside a display:none page have zero size, so an
// IntersectionObserver never fires for them and three of the four pages
// render permanently blank.

const PAGES = ["home", "services", "about", "contact"];

// Written here rather than requested from the model. Reveals are swept
// only at or above the fold so below-the-fold content still animates in
// on scroll, and counters fire once per page and never restart.
export const ROUTER_SCRIPT = `
(function () {
  var PAGES = ['home','services','about','contact'];
  var observer = null, fallbackTimer = null, currentPage = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sweep(page) {
    var els = page.querySelectorAll('.reveal:not(.shown)');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getBoundingClientRect().top < window.innerHeight + 100) els[i].classList.add('shown');
    }
  }
  function onScroll() { if (currentPage) sweep(currentPage); }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseFloat(el.dataset.target);
    if (isNaN(target)) return;
    var dec = parseInt(el.dataset.decimal || '0', 10);
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    var start = null;
    function step(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / 900, 1);
      el.textContent = (target * p).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(step);
  }

  function animate(page) {
    if (reduce) {
      var all = page.querySelectorAll('.reveal');
      for (var i = 0; i < all.length; i++) all[i].classList.add('shown');
    } else if ('IntersectionObserver' in window) {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('shown'); observer.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      var els = page.querySelectorAll('.reveal');
      for (var j = 0; j < els.length; j++) observer.observe(els[j]);
    } else {
      var fb = page.querySelectorAll('.reveal');
      for (var k = 0; k < fb.length; k++) fb[k].classList.add('shown');
    }

    var counters = page.querySelectorAll('.counter');
    for (var c = 0; c < counters.length; c++) countUp(counters[c]);

    currentPage = page;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(function () { sweep(page); }, 1200);
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    sweep(page);
  }

  function route() {
    var id = (location.hash || '').replace('#', '');
    if (PAGES.indexOf(id) === -1) id = 'home';
    for (var i = 0; i < PAGES.length; i++) {
      var el = document.getElementById(PAGES[i]);
      if (el) el.classList.toggle('active', PAGES[i] === id);
    }
    var links = document.querySelectorAll('[data-nav]');
    for (var j = 0; j < links.length; j++) {
      links[j].classList.toggle('active', links[j].getAttribute('data-nav') === id);
    }
    document.body.classList.remove('nav-open');
    window.scrollTo(0, 0);
    var page = document.getElementById(id);
    if (page) animate(page);
  }

  window.addEventListener('hashchange', route);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route);
  else route();

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-nav-toggle]') : null;
    if (t) { e.preventDefault(); document.body.classList.toggle('nav-open'); }
  });
})();
`.trim();

// Structural CSS the router depends on. Kept out of the model's hands so
// page switching cannot break no matter what it writes.
export const STRUCTURAL_CSS = `
.page { display: none; }
.page.active { display: block; }
.reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
.reveal.shown { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
`.trim();

function section(text, name) {
  // Tolerates the model padding the marker with whitespace or wrapping the
  // block in a code fence, both of which it does intermittently.
  const re = new RegExp(`<<<${name}>>>([\\s\\S]*?)(?=<<<[A-Z]+>>>|$)`, "i");
  const m = text.match(re);
  if (!m) return "";
  return m[1]
    .replace(/^\s*\`\`\`(?:html|css)?\s*/i, "")
    .replace(/\`\`\`\s*$/i, "")
    .trim();
}

const PAGE_BRIEFS = {
  home: `The HOME page. A hero with a specific headline (not generic filler), a supporting subheadline, a clear call-to-action and a hero visual. Then a teaser of 3 core services as cards, each linking to href="#services". Then a "why choose us" block with 3-4 concrete differentiators. Then 2-3 short, realistic testimonials with names. End with a final call-to-action block linking to href="#contact".`,
  services: `The SERVICES page. A page headline and short intro, then every service this business actually offers based on the brief, each with its own real write-up of several sentences — genuinely more depth than a card on the home page, or this page has no reason to exist. Then a process / "how it works" section walking through what a customer goes through. End with a call-to-action block linking to href="#contact".`,
  about: `The ABOUT page. The business's story and what actually makes it different, written specifically from the brief. Then whichever of these genuinely fits: the team, a gallery/portfolio, or the service area. Then trust signals — years in business, certifications, guarantees, areas served. End with a call-to-action block linking to href="#contact".`,
  contact: `The CONTACT page. A page headline and a short line inviting the visitor to get in touch, the lead-capture form specified below, contact details and plausible opening hours, and the map if an address was given. Every call to action on the site leads here, so it must feel complete — not a bare form on an empty background.`,
};

// A unit that comes back truncated is retried once, on its own, with an
// instruction to be shorter — rather than failing the whole build.
//
// This is the difference between a failure costing one page and costing
// the entire site. Before, a single truncated response discarded every
// other call's output too, and all of it had already been billed. Each
// unit now stands or falls by itself.
async function callWithRetry(anthropic, { prompt, maxTokens, signal, label }) {
  const TERSER = `

IMPORTANT: a previous attempt at this exact task ran past the length limit and had to be thrown away. Produce the same thing again, but materially shorter — fewer sections, tighter copy, less elaborate CSS — so it finishes well inside the limit. Completeness matters more than richness: a shorter finished result is correct, a longer truncated one is worthless.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await callModelWithBackoff(anthropic, {
      prompt: attempt === 0 ? prompt : prompt + TERSER,
      maxTokens,
      signal,
      label,
    });
    if (r.stopReason !== "max_tokens") return r.text;
    console.warn(`multipage: ${label} truncated on attempt ${attempt + 1}`);
  }
  throw new Error(`multipage_truncated_${label}`);
}

// A 429 or 529 means the request was refused before any tokens were
// produced, so it costs nothing and is always worth retrying. Worth
// guarding here because phase two fires four calls at once: rate limits
// reserve max_tokens up front, so concurrency is exactly when this bites.
async function callModelWithBackoff(anthropic, opts) {
  const DELAYS = [2000, 5000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await callModel(anthropic, opts);
    } catch (err) {
      const transient =
        err?.status === 429 || err?.status === 529 || /rate.?limit|overloaded/i.test(err?.message || "");
      if (!transient || attempt >= DELAYS.length || opts.signal?.aborted) throw err;
      console.warn(`multipage: ${opts.label} got ${err?.status}, retrying in ${DELAYS[attempt]}ms`);
      await new Promise((r) => setTimeout(r, DELAYS[attempt]));
    }
  }
}

async function callModel(anthropic, { prompt, maxTokens, signal }) {
  const stream = anthropic.messages.stream(
    {
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    },
    { signal }
  );
  const msg = await stream.finalMessage();
  const text = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  return { text, stopReason: msg.stop_reason };
}

export async function generateShell({
  anthropic,
  clientName,
  brief,
  imageBlock,
  designBlock,
  signal,
}) {
  const shellPrompt = `You are building a FOUR-PAGE website for a small local business, as one HTML file. This request produces ONLY the shared shell — the head, the stylesheet, the nav and the footer. All four pages are generated separately against the CSS you write here, so the CSS must cover every one of them.

Client/business: "${clientName}"
Brief: "${brief}"

${designBlock}

${imageBlock}

Output EXACTLY these four marked sections, in this order, with nothing before, between or after them except the sections themselves. No markdown fences, no commentary.

<<<HEAD>>>
The contents of <head> EXCEPT any <style> tag: the <title>, <meta name="description">, and any Google Fonts <link> tags. Do NOT include <meta name="viewport"> — it is added automatically. Do not include <html>, <head> or <body> tags themselves.

<<<CSS>>>
The complete stylesheet for the ENTIRE four-page site — every class used by the home page here and by the services, about and contact pages that follow. Plain CSS only, no <style> tag. Requirements:
- Fully responsive; nothing overflows at 375px wide.
- Include an "@media (max-height: 500px) and (orientation: landscape)" rule shrinking hero heading size, padding and min-height so a call-to-action is reachable within about one screen.
- Style a class "active" on nav links for the page currently being viewed.
- Style "body.nav-open" to reveal the mobile nav menu.
- Do NOT write rules for .page, .page.active, .reveal or .reveal.shown — those are provided and will override yours.
- Size any decorative glow/orb using viewport units or clamp(), never fixed pixels, and cap it on mobile so it stays an accent rather than flooding the screen.
- Keep the stylesheet EFFICIENT. This is the one response that must contain the whole site's CSS, and it has run past its length limit before — at which point it is thrown away and rewritten, which costs a full extra minute. Write shared utility classes and reuse them across sections rather than a bespoke rule per section; group selectors that share declarations; skip decorative rules that add length without changing how the site reads. Pick two or three visual techniques and execute them well instead of writing CSS for every effect you can think of. A tight stylesheet that arrives complete beats an elaborate one that gets cut off.

<<<NAV>>>
The sticky nav markup, which appears on every page. It must contain the business name, a link to each of the four pages, and a "Call Now" / "Get a Quote" button (see CONTACT below for what that links to). Every page link must be written exactly as <a href="#home" data-nav="home">, <a href="#services" data-nav="services">, <a href="#about" data-nav="about">, <a href="#contact" data-nav="contact"> — the data-nav attribute is what marks the current page as active. A mobile menu button must carry the attribute data-nav-toggle. Do not write any JavaScript.

<<<FOOTER>>>
The footer markup, which appears on every page: business name, plausible service area, contact info, links to the four pages written the same way as in the nav, and a copyright line.

ANIMATION — do not write any JavaScript anywhere. Animation is handled for you:
- Put class="reveal" on any element that should fade/slide in as it is scrolled to. It starts hidden and is revealed automatically.
- For a counting-up statistic use <span class="counter" data-target="1200">0</span>, or for a decimal <span class="counter" data-target="4.8" data-decimal="1">0</span>. Put the FULL value in data-target and never type extra digits after the span.
- Never write <script> tags, IntersectionObserver, or scroll listeners. They will be stripped.`;

  const shellText = await callWithRetry(anthropic, {
    prompt: shellPrompt,
    maxTokens: 32000,
    signal,
    label: "shell",
  });

  const head = section(shellText, "HEAD");
  const css = section(shellText, "CSS");
  const nav = section(shellText, "NAV");
  const footer = section(shellText, "FOOTER");

  if (!css || !nav) {
    throw new Error("multipage_shell_unparseable");
  }

  return { head, css, nav, footer };
}


// One page, generated on its own request so it has a whole function
// budget to itself. The shell's CSS is passed back in so the page reuses
// the design that already exists.
export async function generatePage({ anthropic, name, clientName, brief, contactBlock, imageBlock, shell, signal }) {
  const prompt = `You are writing ONE page of an existing four-page website for "${clientName}". The site's design and stylesheet already exist — reuse its classes exactly and invent no new ones unless you must, since no new CSS can be added.

Brief: "${brief}"

${PAGE_BRIEFS[name]}

${name === "contact" ? contactBlock : ""}
${name === "about" ? imageBlock : ""}

Here is the site's existing stylesheet. Match its classes and visual language exactly:
\`\`\`css
${shell.css}
\`\`\`

Here is the site's nav, for reference on structure and naming:
\`\`\`html
${shell.nav}
\`\`\`

Output ONLY the inner markup of this one page. No <section class="page"> wrapper, no <html>/<head>/<body>, no <style>, no <script>, no markdown fences, no commentary.

Use class="reveal" on elements that should animate in, and <span class="counter" data-target="...">0</span> for counting statistics. Never write JavaScript — it is provided and yours would be stripped.`;

  const text = await callWithRetry(anthropic, { prompt, maxTokens: 12000, signal, label: name });
  const html = stripStrays(text);
  if (!html) throw new Error(`multipage_page_empty_${name}`);
  return html;
}

export function assembleSite({ shell, pages, clientName }) {
  for (const p of PAGES) {
    if (!pages?.[p]) throw new Error(`multipage_page_missing_${p}`);
  }
  return assemble({
    head: shell.head,
    css: shell.css,
    nav: shell.nav,
    footer: shell.footer,
    bodies: pages,
    clientName,
  });
}

// The model is told not to write scripts or styles; this makes sure of it,
// since an injected observer would fight the provided one.
function stripStrays(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function assemble({ head, css, nav, footer, bodies, clientName }) {
  const pageSections = PAGES.map(
    (p) => `<section class="page" id="${p}">\n${bodies[p]}\n</section>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head || `<title>${clientName}</title>`}
<style>
${STRUCTURAL_CSS}

${css}
</style>
</head>
<body>
${stripStrays(nav)}
${pageSections}
${stripStrays(footer)}
<script>
${ROUTER_SCRIPT}
</script>
</body>
</html>`;
}
