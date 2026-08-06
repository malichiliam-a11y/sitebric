// Monochrome design tokens. The product used to be purple/cyan gradient
// everywhere; the current design language is black/white/grey with a
// single white primary action, so colour is reserved for meaning
// (green = positive, red = failure) rather than decoration.
export const t = {
  bg: "#000000",
  bgPanel: "#0A0A0A",
  bgCard: "#101010",
  bgCardTop: "#161616",
  bgInput: "#111111",
  bgHover: "#1A1A1A",

  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",

  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.56)",
  textFaint: "rgba(255,255,255,0.34)",

  positive: "#4ADE80",
  negative: "#F87171",
  pending: "#FBBF24",

  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

// Cards in the reference design are a very subtle top-lit gradient, not a
// flat fill — keeps large panels from reading as dead rectangles.
export const cardBg = `linear-gradient(180deg, ${t.bgCardTop} 0%, ${t.bgCard} 100%)`;
