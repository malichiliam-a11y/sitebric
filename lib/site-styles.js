// The look of a generated site, chosen before Generate.
//
// Framed as a look rather than a quality tier on purpose. A "quality"
// picker offers a worse option nobody would ever click, and admits the
// default is not the best the thing can do. Every style here is meant to
// be the best version of itself; the only question is which one fits the
// business.
//
// The DESIGN prompt already has a STEP 2 that picks a direction from the
// trade. These are that same list made explicit, plus the two it
// deliberately steered away from — Futuristic and Minimal — which are
// right often enough that a reseller should be able to ask for them.
//
// "Auto" stays the default. It is the current behaviour and it is a good
// one: the model reading "dental practice" and reaching for clean
// professional beats a reseller in a hurry picking at random.

export const DEFAULT_STYLE = "auto";

export const SITE_STYLES = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Picks what suits the trade",
    // No fragment — the prompt's own STEP 2 does the work.
    prompt: null,
  },
  {
    id: "classic",
    label: "Classic",
    blurb: "Warm, timeless, serif",
    prompt: `Warm editorial. Cream and off-white grounds, deep brown or charcoal text, ONE muted accent (terracotta, olive, ochre, burgundy). A refined serif for headings — something with real character, not Times — against a quiet sans for body. Generous margins, left-aligned text, photography given room. It should feel like a well-made menu or a printed brochure: unhurried, confident, nothing shouting.`,
  },
  {
    id: "professional",
    label: "Professional",
    blurb: "Clean, trustworthy, corporate",
    prompt: `Clean professional. White and light grey grounds, near-black text, a single confident accent (deep blue, forest green, navy). A crisp humanist sans throughout. Structured and orderly: clear section rhythm, aligned cards of equal weight, hairline dividers. Credentials, years in business, licences and guarantees given visual prominence. The visitor should feel this business is established and careful. No playfulness.`,
  },
  {
    id: "bold",
    label: "Bold",
    blurb: "Big type, high contrast, trades",
    prompt: `Grounded and sturdy. Off-white or warm grey grounds, strong dark text, a working accent used with force (safety orange, deep red, steel blue). A solid geometric or grotesque sans, heavy weights, squared or barely-rounded corners. Big confident headlines, short lines, phone number impossible to miss and repeated down the page. Built to be read one-handed on a phone by someone who needs this job done today. Weight and clarity over refinement.`,
  },
  {
    id: "luxury",
    label: "Luxury",
    blurb: "Dark, restrained, expensive",
    prompt: `Refined dark. Genuinely dark grounds — near-black, deep charcoal, or a very dark warm neutral — used deliberately, with warm off-white text and ONE restrained accent (brass, bronze, deep gold, or a single jewel tone). A high-contrast display serif for headings. Enormous whitespace, few elements, large photography. Restraint is the entire effect: this must read as expensive, which means fewer things on the page, not more. No glow, no neon, no gradients on text.`,
  },
  {
    id: "futuristic",
    label: "Futuristic",
    blurb: "Dark, technical, sharp",
    // The DESIGN block bans several of these outright as a default look,
    // because they are what a machine reaches for when nobody has asked.
    // Asked for deliberately, some become the point — so this fragment
    // says which are now allowed AND which stay banned, rather than
    // leaving the model to guess and produce the 2015 template.
    prompt: `Technical and forward-looking. Near-black or very dark blue-grey grounds, cool off-white text, ONE electric accent (cyan, electric blue, acid green, or violet) used as a precision instrument — a hairline underline, a single button, a small active indicator. A geometric sans for headings with a monospace for labels, small-caps eyebrow text, and tabular numbers. Sharp 1px borders at low opacity, tight corner radii (2-4px), and a visible sense of grid and alignment.

For THIS style only, the following are permitted where they are precise rather than decorative: a subtle dark-on-dark grid or dot texture at very low opacity, a thin luminous rule under an active nav item, and a restrained glow confined to the single accent on a primary button hover.

Still forbidden, because they are what makes this look cheap: drifting blurred colour orbs, animated gradient meshes, glassmorphism as a signature, holographic or iridescent washes, gradient-filled heading text, and angular clip-path decoration. Precision is the aesthetic, not spectacle.`,
  },
  {
    id: "minimal",
    label: "Minimal",
    blurb: "White space, type only",
    prompt: `Radically minimal. White or near-white ground, near-black text, and at most one accent used two or three times on the entire page. One typeface, carried by size and weight alone. No cards, no shadows, no borders except where genuinely needed to separate. Structure comes from whitespace and alignment — very large section padding, a strict left edge, a narrow measure. Photography full-bleed or absent. Every element must justify being on the page; when in doubt, remove it.`,
  },
];

const BY_ID = new Map(SITE_STYLES.map((s) => [s.id, s]));

/**
 * Resolves an id to a style. Anything unrecognised falls back to Auto.
 *
 * This is the allowlist, and it matters: the id arrives in a request body
 * and its `prompt` is pasted into the instructions sent to the model.
 * Looking the fragment up by id — never interpolating what was sent —
 * is what stops a crafted request from rewriting the design rules, the
 * contact-details rules, or anything else in that prompt.
 */
export function styleById(id) {
  // Strings only, deliberately. String(["classic"]) is "classic", so a
  // JSON array in the request body would otherwise resolve to a real
  // style. Harmless in itself — the fragment still comes from this file —
  // but a lookup that accepts shapes it was never given is the kind of
  // slack that stops being harmless the next time someone extends it.
  if (typeof id !== "string") return BY_ID.get(DEFAULT_STYLE);
  return BY_ID.get(id) || BY_ID.get(DEFAULT_STYLE);
}

export function isKnownStyle(id) {
  return typeof id === "string" && BY_ID.has(id);
}

/**
 * The prompt fragment for a chosen style, or "" for Auto.
 *
 * Written as a STEP 0 so it lands above the prompt's own STEP 2 without
 * that step having to be rewritten — and it deliberately does NOT
 * outrank STEP 1. A brief that names actual colours or fonts is a
 * paying client's instruction; a style button is a starting point.
 */
export function styleBlock(id) {
  const style = styleById(id);
  if (!style.prompt) return "";

  return `
STEP 0 — the direction has already been chosen: ${style.label.toUpperCase()}.
${style.prompt}

This replaces STEP 2 below — do not pick a different direction from the trade. It does NOT replace STEP 1: if the brief names specific colours, fonts or a mood of its own, those still win for the things they name, and this style covers everything they don't.`;
}
