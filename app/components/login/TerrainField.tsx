"use client";

import { useEffect, useRef } from "react";

/**
 * Living particle terrain.
 *
 * A static render cannot undulate, so the landform itself is drawn here:
 * a perspective-projected point field whose height is a fixed dune shape
 * plus travelling ripples, so the mountains breathe and waves run across
 * them continuously.
 *
 * Performance notes, because this draws ~9k points per frame:
 *  - Points are bucketed by alpha and flushed per bucket, so fillStyle
 *    changes ~10 times a frame instead of ~9000. That is the single
 *    biggest win in Canvas 2D.
 *  - Points below a visibility threshold are skipped entirely.
 *  - DPR is capped at 1.5; this is soft texture, not type, and the fill
 *    cost scales with the square of it.
 *  - The loop pauses on tab-hide and never starts under
 *    prefers-reduced-motion (a single static frame is drawn instead, so
 *    the composition is preserved rather than blank).
 */

const COLS = 156;
const ROWS = 72;
const BUCKETS = 10;

function heightAt(u: number, v: number, t: number) {
  // Fixed landform: two offset dunes give a readable silhouette.
  const duneA =
    Math.exp(-Math.pow((u - 0.4) / 0.25, 2)) * Math.exp(-Math.pow((v - 0.54) / 0.48, 2));
  const duneB =
    Math.exp(-Math.pow((u - 0.66) / 0.18, 2)) * Math.exp(-Math.pow((v - 0.62) / 0.42, 2));
  const dune = duneA * 1.0 + duneB * 0.52;

  // Travelling ripples. Scaled by the landform so crests animate more
  // than the flats, which is what makes it read as terrain moving rather
  // than a flat sheet wobbling.
  const wave =
    Math.sin(u * 8.5 - t * 0.62) * Math.cos(v * 4.6 + t * 0.34) * 0.14 +
    Math.sin(u * 16.5 + v * 6.5 - t * 0.95) * 0.05 +
    Math.sin(v * 10.5 - u * 3.8 + t * 0.48) * 0.042;

  return dune + wave * (0.34 + dune * 0.9);
}

export default function TerrainField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let t = 0;
    let last = performance.now();

    // One path per alpha bucket: the whole field becomes BUCKETS fill
    // calls per frame instead of one per point.
    let paths: Path2D[] = [];

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      W = parent.clientWidth;
      H = parent.clientHeight;
      canvas!.width = Math.max(1, Math.floor(W * dpr));
      canvas!.height = Math.max(1, Math.floor(H * dpr));
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
    }

    function draw(now: number) {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      if (!reduced) t += dt;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);

      paths = Array.from({ length: BUCKETS }, () => new Path2D());

      const horizon = H * 0.4;
      const depthSpan = H * 0.66;

      for (let r = 0; r < ROWS; r++) {
        const v = r / (ROWS - 1);
        const rowY = horizon + depthSpan * v * v;
        const spread = 0.44 + v * 1.08;
        const ampScale = H * 0.4 * (0.2 + v);

        for (let c = 0; c < COLS; c++) {
          const u = c / (COLS - 1);
          // Settle toward the edges so it reads as a dune, not a sheet.
          const falloff = Math.pow(Math.sin(Math.PI * u), 1.35);
          if (falloff < 0.01) continue;

          const h = heightAt(u, v, t);
          const x = W * (0.4 + (u - 0.5) * spread);
          const y = rowY - h * ampScale * falloff;

          // Brightness rises with depth (nearer rows are brighter) and
          // with how high the point sits, which lights the crests.
          const a = (0.07 + 0.72 * v) * (0.16 + Math.max(0, h) * 1.5) * falloff;
          if (a < 0.018) continue;

          const bi = Math.min(BUCKETS - 1, Math.floor((a / 0.95) * BUCKETS));
          const size = 0.55 + v * 1.15;
          paths[bi].rect(x, y, size, size);
        }
      }

      for (let i = 0; i < BUCKETS; i++) {
        const alpha = ((i + 0.5) / BUCKETS) * 0.95;
        ctx!.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx!.fill(paths[i]);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduced) start();
    }

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    resize();
    if (reduced) draw(performance.now());
    else start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
