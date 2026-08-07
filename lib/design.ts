// Design tokens reverse-engineered from the reference screenshot,
// measured against a 1536x1040 render.
//
// Everything here is a number taken off the source image rather than a
// round number chosen for convenience — the whole point is that the
// layout reproduces rather than approximates.

export const palette = {
  bg: "#000000",
  card: "rgba(5,5,6,0.88)",
  cardTop: "rgba(11,11,12,0.9)",
  input: "rgba(255,255,255,0.024)",
  tile: "rgba(255,255,255,0.026)",

  hairline: "rgba(255,255,255,0.08)",
  hairlineStrong: "rgba(255,255,255,0.12)",
  hairlineFocus: "rgba(255,255,255,0.28)",

  text: "#F2F2F2",
  textMuted: "rgba(255,255,255,0.56)",
  textFaint: "rgba(255,255,255,0.40)",
  textGhost: "rgba(255,255,255,0.30)",

  positive: "#4ADE80",
  negative: "#F87171",
} as const;

// Measured off the reference: the card occupies x805–1400, y110–903.
export const metrics = {
  cardWidth: 596,
  cardRadius: 20,
  cardPadX: 52,
  cardPadTop: 53,
  cardPadBottom: 43,

  controlHeight: 54,
  controlRadius: 10,

  // Gutters are asymmetric in the source: ~6.2% left, ~8.8% right.
  gutterLeft: "6.2%",
  gutterRight: "8.8%",

  featureTile: 52,
  featureTileRadius: 14,
  featureGap: 30,

  navHeight: 102,
} as const;

export const easing = [0.22, 1, 0.36, 1] as const;
