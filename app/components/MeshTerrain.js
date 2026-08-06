import { t } from "@/lib/theme";

// Wireframe terrain standing in for the 3D render in the reference art.
// Generated from a fixed sine field rather than randomness so the server
// and client produce byte-identical markup (no hydration mismatch) and
// no image asset has to ship.
const W = 1000;
const H = 640;
const COLS = 62;
const ROWS = 34;

function height(u, v) {
  // A dominant dune ridge plus finer ripples, so the surface reads as
  // terrain rather than a flat wavy grid.
  const ridge = Math.exp(-Math.pow((u - 0.46) / 0.23, 2)) * Math.exp(-Math.pow((v - 0.52) / 0.34, 2));
  return (
    ridge * 1.25 +
    Math.sin(u * 6.2 + 1.1) * Math.cos(v * 2.6 + 0.5) * 0.3 +
    Math.sin(u * 13.5 + v * 3.4) * 0.11 +
    Math.sin(v * 5.2 - u * 2.4) * 0.13
  );
}

const grid = [];
for (let r = 0; r < ROWS; r++) {
  const v = r / (ROWS - 1);
  // Rows bunch toward the horizon for perspective.
  const baseY = H * (0.2 + 0.8 * Math.pow(v, 2.05));
  const amp = 120 * (0.18 + v);
  const row = [];
  for (let c = 0; c < COLS; c++) {
    const u = c / (COLS - 1);
    // Flatten the ridge toward the outer edges so it reads as a dune.
    const falloff = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 1.4);
    row.push([+(W * u).toFixed(2), +(baseY - height(u, v) * amp * falloff).toFixed(2)]);
  }
  grid.push(row);
}

const toPath = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");

export default function MeshTerrain({ style }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{ display: "block", ...style }}
    >
      <defs>
        <linearGradient id="meshFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="34%" stopColor="#FFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="beamFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFF" stopOpacity="0.85" />
        </linearGradient>
        <mask id="meshMask">
          <rect width={W} height={H} fill="url(#meshFade)" />
        </mask>
      </defs>
      {/* Light shafts rising off the ridge, as in the reference art. */}
      <g mask="url(#meshMask)">
        {[0.3, 0.42, 0.5, 0.58, 0.7].map((u, i) => {
          const x = W * u;
          const topY = grid[Math.round(ROWS * 0.42)][Math.round((COLS - 1) * u)][1];
          return (
            <rect
              key={`beam${i}`}
              x={x - 0.7}
              y={topY - 210}
              width="1.4"
              height="230"
              fill="url(#beamFade)"
              opacity={0.5 - Math.abs(u - 0.5) * 0.5}
            />
          );
        })}
      </g>

      <g mask="url(#meshMask)" fill="none" stroke="#FFFFFF" strokeWidth="0.55" opacity="0.62">
        {grid.map((row, r) => (
          <path key={`h${r}`} d={toPath(row)} opacity={0.22 + 0.78 * (r / (ROWS - 1))} />
        ))}
        {Array.from({ length: COLS }, (_, c) => (
          <path key={`v${c}`} d={toPath(grid.map((row) => row[c]))} opacity="0.3" />
        ))}
      </g>
    </svg>
  );
}
