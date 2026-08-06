// Design tokens taken from the visual reference.
//
// Near-black surfaces separated by low-opacity white hairlines, a grey
// text ramp, one white primary action. Colour only where it means
// something (gold rating, green/red status).
export const t = {
  bg: "#0B0B0D",
  bgPanel: "#0E0E11",
  bgCard: "rgba(255,255,255,0.03)",
  bgSurface: "rgba(255,255,255,0.04)",
  bgInput: "rgba(255,255,255,0.04)",
  bgHover: "rgba(255,255,255,0.07)",

  border: "rgba(255,255,255,0.08)",
  borderCard: "rgba(255,255,255,0.1)",
  borderInput: "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.15)",
  borderFocus: "rgba(255,255,255,0.4)",

  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.6)",
  textSubtle: "rgba(255,255,255,0.5)",
  textFaint: "rgba(255,255,255,0.45)",
  textGhost: "rgba(255,255,255,0.35)",

  gold: "#FBBF24",
  positive: "#4ADE80",
  negative: "#F87171",
  pending: "#FBBF24",

  // Inter throughout; headings differentiated by weight, not family.
  display: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  body: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",

  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
};

export const type = {
  display: { fontWeight: 700, fontSize: "clamp(36px, 4.5vw, 52px)", lineHeight: 1.1, letterSpacing: "-0.02em" },
  title: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" },
  heading: { fontSize: 18, fontWeight: 600 },
  bodyLg: { fontSize: 16, fontWeight: 400, lineHeight: 1.7 },
  body: { fontSize: 14, fontWeight: 400 },
  label: { fontSize: 13, fontWeight: 600 },
  small: { fontSize: 13, fontWeight: 400 },
  micro: { fontSize: 12, fontWeight: 600 },
};

export const cardBg = t.bgCard;
