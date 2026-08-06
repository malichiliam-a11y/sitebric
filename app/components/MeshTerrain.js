// Procedural wireframe terrain for the login backdrop.
//
// Deliberately very low contrast: it should register as texture at the
// edge of vision and disappear the moment you read the form. Generated
// from a fixed sine field (no randomness) so server and client markup
// match byte-for-byte and nothing has to be downloaded.
const W = 1000;
const H = 620;
const COLS = 58;
const ROWS = 32;

function surface(u, v) {
  // One dominant ridge, then two smaller harmonics so the mesh doesn't
  // read as a regular wave.
  const ridge =
    Math.exp(-Math.pow((u - 0.47) / 0.24, 2)) * Math.exp(-Math.pow((v - 0.55) / 0.36, 2));
  return (
    ridge * 1.2 +
    Math.sin(u * 6.1 + 1.2) * Math.cos(v * 2.7 + 0.4) * 0.26 +
    Math.sin(u * 12.8 + v * 3.2) * 0.08
  );
}

const grid = [];
for (let r = 0; r < ROWS; r++) {
  const v = r / (ROWS - 1);
  // Rows compress toward the horizon to fake perspective.
  const baseY = H * (0.22 + 0.78 * Math.pow(v, 2.1));
  const amp = 110 * (0.16 + v);
  const row = [];
  for (let c = 0; c < COLS; c++) {
    const u = c / (COLS - 1);
    // Settle the surface toward the edges so it reads as a dune, not a sheet.
    const falloff = Math.pow(Math.sin(Math.PI * u), 1.5);
    row.push([+(W * u).toFixed(2), +(baseY - surface(u, v) * amp * falloff).toFixed(2)]);
  }
  grid.push(row);
}

const toPath = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
const beams = [0.34, 0.44, 0.52, 0.62];

export default function MeshTerrain({ style }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ display: "block", ...style }}>
      <defs>
        <linearGradient id="mtFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="40%" stopColor="#FFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="mtBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0.6" />
        </linearGradient>
        <mask id="mtMask">
          <rect width={W} height={H} fill="url(#mtFade)" />
        </mask>
      </defs>

      <g mask="url(#mtMask)">
        {beams.map((u, i) => {
          const topY = grid[Math.round(ROWS * 0.45)][Math.round((COLS - 1) * u)][1];
          return (
            <rect
              key={i}
              x={W * u - 0.5}
              y={topY - 190}
              width="1"
              height="205"
              fill="url(#mtBeam)"
              opacity={0.32 - Math.abs(u - 0.48) * 0.5}
            />
          );
        })}

        <g fill="none" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.3">
          {grid.map((row, r) => (
            <path key={`h${r}`} d={toPath(row)} opacity={0.18 + 0.82 * (r / (ROWS - 1))} />
          ))}
          {Array.from({ length: COLS }, (_, c) => (
            <path key={`v${c}`} d={toPath(grid.map((row) => row[c]))} opacity="0.22" />
          ))}
        </g>
      </g>
    </svg>
  );
}
