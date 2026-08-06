// Procedural wireframe terrain for the login backdrop.
//
// Matches the reference art: a dense bright mesh dune with volumetric
// light shafts rising off the ridge and a soft bloom behind it.
// Generated from a fixed sine field (no randomness) so server and client
// markup match byte-for-byte and no image has to be downloaded.
const W = 1000;
const H = 620;
const COLS = 78;
const ROWS = 44;

function surface(u, v) {
  // One dominant ridge, then harmonics so the mesh does not read as a
  // regular wave.
  const ridge =
    Math.exp(-Math.pow((u - 0.47) / 0.24, 2)) * Math.exp(-Math.pow((v - 0.55) / 0.36, 2));
  return (
    ridge * 1.35 +
    Math.sin(u * 6.1 + 1.2) * Math.cos(v * 2.7 + 0.4) * 0.3 +
    Math.sin(u * 12.8 + v * 3.2) * 0.1 +
    Math.sin(v * 5.4 - u * 2.6) * 0.09
  );
}

const grid = [];
for (let r = 0; r < ROWS; r++) {
  const v = r / (ROWS - 1);
  // Rows compress toward the horizon to fake perspective.
  const baseY = H * (0.2 + 0.8 * Math.pow(v, 2.05));
  const amp = 128 * (0.16 + v);
  const row = [];
  for (let c = 0; c < COLS; c++) {
    const u = c / (COLS - 1);
    // Settle the surface toward the edges so it reads as a dune, not a sheet.
    const falloff = Math.pow(Math.sin(Math.PI * u), 1.4);
    row.push([+(W * u).toFixed(2), +(baseY - surface(u, v) * amp * falloff).toFixed(2)]);
  }
  grid.push(row);
}

const toPath = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
const ridgeRow = grid[Math.round(ROWS * 0.42)];
const beams = [0.3, 0.375, 0.44, 0.5, 0.56, 0.63, 0.71];

export default function MeshTerrain({ style }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ display: "block", ...style }}>
      <defs>
        <linearGradient id="mtFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="26%" stopColor="#FFF" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#FFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="mtBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="70%" stopColor="#FFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="mtBloom" cx="47%" cy="52%" r="42%">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#FFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </radialGradient>
        {/* Bloom on the shafts, so they read as light rather than hairlines. */}
        <filter id="mtGlow" x="-60%" y="-30%" width="220%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Fades the left edge so the marketing copy always sits on
            clean black instead of over live mesh lines. */}
        <linearGradient id="mtSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" />
          <stop offset="34%" stopColor="#FFF" />
          <stop offset="100%" stopColor="#FFF" />
        </linearGradient>
        <mask id="mtMask">
          <rect width={W} height={H} fill="url(#mtFade)" />
          <rect width={W} height={H} fill="url(#mtSide)" style={{ mixBlendMode: "multiply" }} />
        </mask>
      </defs>

      <g mask="url(#mtMask)">
        <rect width={W} height={H} fill="url(#mtBloom)" />

        <g filter="url(#mtGlow)">
          {beams.map((u, i) => {
            const topY = ridgeRow[Math.round((COLS - 1) * u)][1];
            const falloff = 1 - Math.abs(u - 0.5) * 1.5;
            return (
              <rect
                key={i}
                x={W * u - 0.6}
                y={topY - 250}
                width="1.2"
                height="268"
                fill="url(#mtBeam)"
                opacity={Math.max(0.18, 0.85 * falloff)}
              />
            );
          })}
        </g>

        <g fill="none" stroke="#FFFFFF" strokeWidth="0.55" opacity="0.85">
          {grid.map((row, r) => (
            <path key={`h${r}`} d={toPath(row)} opacity={0.12 + 0.68 * (r / (ROWS - 1))} />
          ))}
          {Array.from({ length: COLS }, (_, c) => (
            <path key={`v${c}`} d={toPath(grid.map((row) => row[c]))} opacity="0.28" />
          ))}
        </g>
      </g>
    </svg>
  );
}
