// Runs the real multi-page pipeline — shell, four pages, assembly —
// against a model response containing every failure this feature has
// actually shipped: a duplicate nav with .html links, an id colliding
// with a page name, stray scripts, a duplicate footer, code fences, and a
// nav listing more entries than there are pages.
//
// Assembly is the single point every site passes through, first build and
// rebuild alike, so these guarantees hold for every site rather than for
// the ones someone remembered to check.
//
//   node test/multipage-guarantee.mjs
import { generateShell, generatePage, assembleSite } from "../lib/multipage.js";

// Everything that has gone wrong so far, in one model response.
const SHELL = `<<<HEAD>>>
\`\`\`html
<title>Bergen Basin Real Estate</title>
\`\`\`
<<<CSS>>>
body{margin:0;background:#0b2545;color:#fff;font-family:sans-serif}
nav{position:sticky;top:0;padding:14px}nav a{color:#cbd5e1;margin-right:14px}
.page-header{padding:80px 24px;background:#0e2f56}.block{padding:60px 24px}.spacer{height:120vh}
<<<NAV>>>
<nav>
  <a href="#home" class="nav-brand">Bergen Basin<br>Real Estate</a>
  <ul>
    <li><a href="#home" data-nav="home">HOME</a></li>
    <li><a href="#services" data-nav="services">PROPERTIES</a></li>
    <li><a href="#services">BUY</a></li>
    <li><a href="#services">SELL</a></li>
    <li><a href="#about" data-nav="about">ABOUT</a></li>
    <li><a href="#contact" data-nav="contact">CONTACT</a></li>
  </ul>
  <button data-nav-toggle>Menu</button>
  <a href="tel:9296025599" class="call-btn">CALL NOW</a>
</nav>
<<<FOOTER>>>
<footer class="shell-footer">© Bergen Basin</footer>
<script>alert('shell script')</script>`;

// A whole document instead of page content: duplicate nav with .html
// links, an id colliding with a page name, a stray script and a footer.
const pageOut = (n) => `\`\`\`html
<nav class="site-nav"><a href="index.html">Home</a><a href="properties.html">Properties</a></nav>
<header class="page-header"><h1 class="reveal" data-t="${n}-1">${n.toUpperCase()} HEADER</h1></header>
<div class="spacer"></div>
<section class="block" id="${n === "home" ? "services" : "contact"}">
  <h2 class="reveal" data-t="${n}-deep">${n} deep content</h2>
  <a href="#contact" id="${n}-cta">Get a Quote</a>
</section>
<footer class="page-footer">dupe footer</footer>
<script>console.log('page script')</script>
\`\`\``;

const model = (t) => ({ messages: { stream: () => ({ async finalMessage() { return { stop_reason: "end_turn", content: [{ type: "text", text: t }] }; } }) } });

// The real path: shell, then four pages, then assemble.
const shell = await generateShell({ anthropic: model(SHELL), clientName: "Bergen Basin Real Estate", brief: "real estate", imageBlock: "i", designBlock: "d" });
const pages = {};
for (const n of ["home", "services", "about", "contact"]) {
  pages[n] = await generatePage({ anthropic: model(pageOut(n)), name: n, clientName: "Bergen Basin Real Estate", brief: "b", contactBlock: "c", imageBlock: "i", shell });
}
const html = assembleSite({ shell, pages, clientName: "Bergen Basin Real Estate" });

let fail = 0;
const check = (ok, m) => { if (!ok) fail++; console.log((ok ? "PASS  " : "FAIL  ") + m); };

check((html.match(/<nav/g) || []).length === 1, `one nav (${(html.match(/<nav/g) || []).length})`);
check((html.match(/<footer/g) || []).length === 1, `one footer (${(html.match(/<footer/g) || []).length})`);
check((html.match(/<script/g) || []).length === 1, `one script, the router (${(html.match(/<script/g) || []).length})`);
check(!/alert\(|console\.log\('page script'\)/.test(html), "model scripts stripped");
check((html.match(/href="[^"]*\.html?["#]/gi) || []).length === 0, "no file links");
for (const id of ["home", "services", "about", "contact"]) {
  const n = (html.match(new RegExp(`id="${id}"`, "g")) || []).length;
  check(n === 1, `id="${id}" unique (${n})`);
}
check((html.match(/<header class="page-header">/g) || []).length === 4, `all four header bands kept (${(html.match(/<header class="page-header">/g) || []).length})`);
const navBlock = html.match(/<nav[\s\S]*?<\/nav>/)[0];
check(!/>BUY</.test(navBlock) && !/>SELL</.test(navBlock), "redundant nav entries collapsed");
check(/tel:9296025599/.test(navBlock), "tel: button preserved");
check(!html.includes("```"), "no code fences");
check(html.includes(".page.active"), "structural CSS present");
check(html.includes('name="viewport"'), "viewport meta present");
console.log(fail === 0 ? "\nEVERY-SITE GUARANTEE OK" : `\n${fail} FAILURE(S)`);
process.exit(fail === 0 ? 0 : 1);
