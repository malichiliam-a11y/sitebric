// Drives the logo transform over the real nav shapes these sites ship.
//
// Every fixture below is copied from actual stored HTML, not invented —
// the brand element turns up as .nav-brand, .nav-logo and .nav__brand,
// sometimes already containing an <img>, and its text is regularly broken
// up by nested <span> and <br>. A transform written against a tidy
// imagined nav would pass its own tests and fail on every real site.
//
//   npm i --no-save playwright && node test/logo.mjs

import { chromium } from "playwright";
import assert from "node:assert";
import { applyLogo, removeLogo, hasLogo, currentLogoUrl } from "../lib/logo.js";

const LOGO = "https://example.com/storage/logo.png";

const page = (nav) =>
  `<!DOCTYPE html><html><head><style>body{margin:0}</style></head><body>${nav}
<section id="contact"><h2>Contact</h2></section></body></html>`;

const FIXTURES = [
  {
    name: "nav-logo, nested span and br",
    html: page(`<nav id="main-nav">
  <div class="nav-inner">
    <a href="#contact" class="nav-logo">Diamond <span>Stone</span><br>& Synthetic Grass</a>
    <ul class="nav-links"><li><a href="#services">Services</a></li></ul>
  </div>
</nav>`),
    wordmark: "Diamond",
  },
  {
    name: "nav-brand with a trailing span",
    html: page(`<nav id="navbar">
  <div class="container"><div class="nav-inner">
    <a href="#contact" class="nav-brand">Siana Remodeling<span>Walker, Louisiana</span></a>
    <ul class="nav-links"><li><a href="#about">About</a></li></ul>
  </div></div>
</nav>`),
    wordmark: "Siana Remodeling",
  },
  {
    name: "nav__brand with data-nav (multi-page)",
    html: page(`<nav class="nav" id="main-nav">
  <div class="container"><div class="nav__inner">
    <a href="#home" class="nav__brand" data-nav="home">Florida <span>Pool &amp; Spa</span></a>
    <ul class="nav__links"><li><a href="#home" data-nav="home">Home</a></li></ul>
  </div></div>
</nav>`),
    wordmark: "Florida",
  },
  {
    name: "brand that already contains an image",
    html: page(`<nav id="main-nav">
  <div class="container"><div class="nav-inner">
    <a href="#contact" class="nav-brand">
      <img src="https://example.com/old-photo.jpg" alt="old" class="nav-logo">
      Siana<span>.</span> Remodeling
    </a>
    <div class="nav-links"><a href="#services">Services</a></div>
  </div></div>
</nav>`),
    wordmark: "Remodeling",
    replacesExistingImage: true,
  },
  {
    name: "plain single-word brand",
    html: page(`<nav id="main-nav">
  <div class="nav-inner">
    <a class="nav-logo" href="#top">Tacos La Fondita</a>
    <ul class="nav-links"><li><a href="#menu">Menu</a></li></ul>
  </div>
</nav>`),
    wordmark: "Tacos La Fondita",
  },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

for (const f of FIXTURES) {
  console.log(`\n${f.name}`);

  const applied = applyLogo(f.html, { logoUrl: LOGO, businessName: "Test Co" });
  check("a brand element was found", () => assert.strictEqual(applied.changed, true));
  check("hasLogo reports true", () => assert.ok(hasLogo(applied.code)));
  check("the url can be read back", () =>
    assert.strictEqual(currentLogoUrl(applied.code), LOGO));

  // What the visitor actually sees is the only thing that matters here.
  const p = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.setContent(applied.code, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(150);

  const shown = await p.evaluate(() => {
    const img = document.querySelector(".sb-logo-img");
    const txt = document.querySelector(".sb-logo-text");
    return {
      imgExists: !!img,
      imgSrc: img ? img.getAttribute("src") : null,
      imgVisible: img ? img.getBoundingClientRect().height > 8 : false,
      textHidden: txt ? getComputedStyle(txt).display === "none" : null,
      navText: (document.querySelector("nav") || document.body).innerText.trim(),
      // Only one logo image, even though one fixture already had an <img>.
      logoCount: document.querySelectorAll(".sb-logo-img").length,
    };
  });
  await p.close();

  check("the logo image is in the nav", () => assert.ok(shown.imgExists));
  check("it points at the uploaded file", () => assert.strictEqual(shown.imgSrc, LOGO));
  check("it has real height on screen", () => assert.ok(shown.imgVisible, "image collapsed"));
  check("the old wordmark is hidden", () => assert.strictEqual(shown.textHidden, true));
  check("the wordmark text is not visible", () =>
    assert.ok(!shown.navText.includes(f.wordmark), `still saw "${f.wordmark}"`));
  check("exactly one logo image", () => assert.strictEqual(shown.logoCount, 1));
  check("no JS errors", () => assert.strictEqual(errors.length, 0));

  // Reversibility is the whole reason the original is kept rather than discarded.
  check("removing restores the original exactly", () =>
    assert.strictEqual(removeLogo(applied.code), f.html));

  // Applying twice must swap, not stack.
  const twice = applyLogo(applied.code, { logoUrl: LOGO, businessName: "Test Co" });
  check("re-applying is a no-op", () => assert.strictEqual(twice.code, applied.code));

  const swapped = applyLogo(applied.code, {
    logoUrl: "https://example.com/other.png",
    businessName: "Test Co",
  });
  check("swapping to a new logo leaves one image", () => {
    assert.strictEqual(currentLogoUrl(swapped.code), "https://example.com/other.png");
    assert.strictEqual((swapped.code.match(/sb-logo-img/g) || []).length, 2); // css rule + the img
  });
  check("swapping still restores the original wordmark", () =>
    assert.strictEqual(removeLogo(swapped.code), f.html));
}

// A page with nothing that looks like a brand should report honestly
// rather than silently doing nothing and claiming success.
{
  console.log("\nno brand element");
  const bare = `<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>`;
  const r = applyLogo(bare, { logoUrl: LOGO, businessName: "X" });
  check("changed is false", () => assert.strictEqual(r.changed, false));
  check("the code is untouched", () => assert.strictEqual(r.code, bare));
}

// Quotes in a business name must not break out of the alt attribute.
// Checked by letting a real parser read the attributes back, which is the
// only thing that actually proves the markup is well formed — counting
// quotes in the raw string cannot tell an escaped one from the start of
// the next attribute.
{
  console.log("\nescaping");
  const r = applyLogo(FIXTURES[0].html, {
    logoUrl: "https://x.com/a.png?a=1&b=2",
    businessName: 'Bob "The Builder" & Sons',
  });

  const p = await browser.newPage();
  await p.setContent(r.code, { waitUntil: "domcontentloaded" });
  const attrs = await p.evaluate(() => {
    const img = document.querySelector(".sb-logo-img");
    return {
      alt: img.getAttribute("alt"),
      src: img.getAttribute("src"),
      attrCount: img.attributes.length,
    };
  });
  await p.close();

  check("the alt survives the round trip intact", () =>
    assert.strictEqual(attrs.alt, 'Bob "The Builder" & Sons logo'));
  check("the url survives the round trip intact", () =>
    assert.strictEqual(attrs.src, "https://x.com/a.png?a=1&b=2"));
  check("no stray attributes were created", () =>
    assert.strictEqual(attrs.attrCount, 3));
}

await browser.close();

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
