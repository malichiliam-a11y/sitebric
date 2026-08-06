// Design tokens extracted from the reference, not copied off it.
//
// The system is: near-black surfaces separated by 8%-opacity hairlines,
// a three-step grey text ramp, one white primary action, and colour used
// only to mean something. Depth comes from surface value and whitespace,
// never from glow.
export const t = {
  // Surfaces — each step is a barely-perceptible lift, so panels read as
  // layered rather than outlined.
  bg: "#050505",
  bgPanel: "#080808",
  bgCard: "#0B0B0B",
  bgCardTop: "#101010",
  bgInput: "#0A0A0A",
  bgHover: "#161616",

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

  // One family, differentiated by weight and tracking.
  display: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  body: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",

  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
};

// Type scale. Large sizes get negative tracking — Inter is drawn loose
// for UI, and display copy needs it pulled in to look intentional.
export const type = {
  display: { fontSize: 56, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.05 },
  title: { fontSize: 40, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1 },
  heading: { fontSize: 21, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.3 },
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
