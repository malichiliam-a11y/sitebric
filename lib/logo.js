// Putting a real logo image on a finished site.
//
// Generated sites render the brand as *text* — the prompt asks for
// "business name/logo text" — so a client who has an actual logo file had
// no way to get it onto their own website. The only workaround was
// regenerating the site, which costs a generation and still produces
// text.
//
// This is a pure string transform over the stored HTML, the same approach
// as the button guard: no model call, so applying a logo is instant, free
// and costs nobody a generation.
//
// Everything it inserts is wrapped in comment markers, and the markup it
// replaces is kept inside those markers rather than thrown away. That is
// what makes removing a logo restore the original wordmark exactly, and
// what makes applying one twice a no-op instead of a pile-up.

const OPEN = "<!--sb-logo-->";
const ORIG_OPEN = "<!--sb-logo-orig-->";
const ORIG_CLOSE = "<!--/sb-logo-orig-->";
const CLOSE = "<!--/sb-logo-->";

const STYLE_OPEN = "<!--sb-logo-style-->";
const STYLE_CLOSE = "<!--/sb-logo-style-->";

// Deliberately delimited by comments rather than by matching tags: the
// original brand markup contains nested <span> and <br> (real examples:
// `Diamond <span>Stone</span><br>& Synthetic Grass`), and a regex that
// tried to find the matching </span> would have to balance them. Comments
// cannot nest here, so a non-greedy match between them is exact.
const BLOCK_RE = new RegExp(
  `${OPEN}[\\s\\S]*?${ORIG_OPEN}([\\s\\S]*?)${ORIG_CLOSE}[\\s\\S]*?${CLOSE}`,
  "g"
);
const STYLE_RE = new RegExp(`${STYLE_OPEN}[\\s\\S]*?${STYLE_CLOSE}`, "g");

export function hasLogo(code) {
  return typeof code === "string" && code.includes(OPEN);
}

// The URL currently in use, so the dashboard can show what's applied
// without needing a column of its own to fall out of sync.
export function currentLogoUrl(code) {
  if (!code) return null;
  const m = code.match(new RegExp(`${OPEN}\\s*<img[^>]*\\ssrc="([^"]+)"`));
  return m ? m[1] : null;
}

// Restores the original wordmark. Safe to call on code that has no logo.
export function removeLogo(code) {
  if (!code) return code;
  return String(code).replace(BLOCK_RE, "$1").replace(STYLE_RE, "");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Finds the element holding the brand. Checked against the real shapes
// these sites actually ship: the brand is the first <a> inside the first
// <nav>, carrying a class of nav-brand, nav-logo or nav__brand depending
// on which way the model went that day. Nested <a> is invalid HTML, so
// matching to the first </a> is exact rather than merely likely.
function findBrand(code) {
  const navMatch = code.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i);
  const scope = navMatch ? navMatch[0] : null;
  const scopeStart = navMatch ? navMatch.index : 0;

  if (scope) {
    const anchor = scope.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
    if (anchor && anchor[1].trim()) {
      return {
        start: scopeStart + anchor.index + anchor[0].indexOf(">") + 1,
        end: scopeStart + anchor.index + anchor[0].lastIndexOf("</a>"),
        inner: anchor[1],
      };
    }
  }

  // No <nav>, or a nav whose first link is empty. Fall back to the first
  // element whose class names it as the brand — a header-based layout
  // rather than a nav-based one.
  const classed = code.match(
    /<(a|div|span|h1)\b[^>]*class="[^"]*\b(?:nav-brand|nav__brand|nav-logo|navbar-brand|brand|logo)\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/i
  );
  if (classed && classed[2].trim()) {
    return {
      start: classed.index + classed[0].indexOf(">") + 1,
      end: classed.index + classed[0].lastIndexOf(`</${classed[1]}>`),
      inner: classed[2],
    };
  }

  return null;
}

// The stylesheet for the inserted image. Height is clamped rather than
// fixed because these navs are not built to one spec — a hard 40px looks
// wrong in a compact nav and lost in a tall one.
function styleBlock() {
  return `${STYLE_OPEN}
<style>
  .sb-logo-img {
    height: clamp(30px, 4.4vw, 46px);
    width: auto;
    max-width: 210px;
    display: block;
    object-fit: contain;
  }
  .sb-logo-text { display: none !important; }
</style>
${STYLE_CLOSE}`;
}

/**
 * Puts `logoUrl` in place of the site's text wordmark.
 *
 * Returns { code, changed }. `changed` is false when no brand element
 * could be found, so the caller can say so rather than reporting a
 * success that did nothing.
 */
export function applyLogo(code, { logoUrl, businessName = "" } = {}) {
  if (!code || !logoUrl) return { code, changed: false };

  // Start from the original wordmark every time, so replacing one logo
  // with another doesn't nest a second block inside the first.
  const base = removeLogo(code);
  const brand = findBrand(base);
  if (!brand) return { code, changed: false };

  const alt = escapeAttr(businessName ? `${businessName} logo` : "Logo");
  const src = escapeAttr(logoUrl);

  // The original markup is kept, hidden, between the inner markers. That
  // is what "Remove logo" reads to put the wordmark back.
  const replacement =
    `${OPEN}<img src="${src}" alt="${alt}" class="sb-logo-img">` +
    `<span class="sb-logo-text">${ORIG_OPEN}${brand.inner}${ORIG_CLOSE}</span>${CLOSE}`;

  let out = base.slice(0, brand.start) + replacement + base.slice(brand.end);

  // Styles go in <head> where they belong, falling back to prepending if
  // this file somehow has no head.
  const headClose = out.toLowerCase().lastIndexOf("</head>");
  out =
    headClose === -1
      ? styleBlock() + out
      : out.slice(0, headClose) + styleBlock() + out.slice(headClose);

  return { code: out, changed: true };
}
