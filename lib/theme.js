// Design tokens extracted from the reference, not copied off it.
//
// The system is: near-black surfaces separated by 8%-opacity hairlines,
// a three-step grey text ramp, one white primary action, and colour used
// only to mean something. Depth comes from surface value and whitespace,
// never from glow.
export const t = {
  // Surfaces — each step is a barely-perceptible lift, so panels read as
  // layered rather than outlined.
  // Taken down to true black. The previous ramp topped out at #161616,
  // which reads as charcoal next to the login screen's pure black — the
  // separation now comes from hairlines and light, not from grey.
  bg: "#000000",
  bgPanel: "#030303",
  bgCard: "#050506",
  bgCardTop: "#0A0A0B",
  bgInput: "#030304",
  bgHover: "#101011",

  // Hairlines. 0.08 is the resting weight; the other two are for focus
  // and hover only — going heavier makes the UI feel boxed-in.
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  borderStrong: "rgba(255,255,255,0.22)",

  // Text ramp. Primary is deliberately #EDEDED rather than pure white —
  // full white on near-black vibrates and reads cheap at large sizes.
  text: "#EDEDED",
  textMuted: "#A1A1A1",
  textFaint: "#6E6E6E",

  positive: "#4ADE80",
  negative: "#F87171",
  pending: "#FBBF24",

  // Two families with different jobs: a serif that carries the headlines
  // and a sans that carries the reading. The variables are set in
  // app/layout.js; the fallbacks matter because a font that fails to load
  // must not drop the page into Times New Roman.
  display: "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif",
  body: "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif",

  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
};

// Type scale. Manrope sets a little tighter than Inter, so the large
// sizes need less negative tracking than the original values — but more
// than a serif would, which is why these sit between the two.
export const type = {
  display: { fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.06 },
  title: { fontSize: 40, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.12 },
  heading: { fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.3 },
  bodyLg: { fontSize: 15.5, fontWeight: 400, letterSpacing: "-0.005em", lineHeight: 1.65 },
  body: { fontSize: 14.5, fontWeight: 400, lineHeight: 1.5 },
  label: { fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" },
  small: { fontSize: 13.5, fontWeight: 400 },
  micro: { fontSize: 11.5, fontWeight: 500, letterSpacing: "0.1em" },
};

// Control height is the one hard number the reference is strict about.
export const CONTROL_H = 54;

// A single hairline-bounded surface with a whisper of top light. Not a
// glow — just enough value shift to separate it from the page.
export const cardBg = `linear-gradient(180deg, ${t.bgCardTop} 0%, ${t.bgCard} 100%)`;
