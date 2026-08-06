"use client";

import { useEffect, useRef } from "react";

/**
 * The backdrop from the reference: a perspective-projected particle
 * terrain with a wireframe mesh over it, volumetric light shafts rising
 * off the ridge, drifting motes, and a real two-pass bloom.
 *
 * Canvas rather than SVG. SVG can draw the lines but cannot do the
 * additive bloom or per-point depth brightness without a filter stack
 * that costs more than it is worth, and the result reads flat.
 *
 * Rendering runs on a fixed-timestep loop that pauses when the tab is
 * hidden and stops entirely under prefers-reduced-motion (a single
 * static frame is drawn instead, so the composition is never lost).
 */

const COLS = 116;
const ROWS = 74;

// Height field. One dominant dune with harmonics so it does not read as
// a regular wave; sampled per-frame with a slow phase drift.
function heightAt(u: number, v: number, phase: number) {
  const ridge =
    Math.exp(-Math.pow((u - 0.5) / 0.26, 2)) * Math.exp(-Math.pow((v - 0.58) / 0.4, 2));
  return (
    ridge * 1.45 +
    Math.sin(u * 6.4 + 1.1 + phase * 0.6) * Math.cos(v * 2.8 + 0.4) * 0.3 +
    Math.sin(u * 13.2 + v * 3.4 - phase) * 0.085 +
    Math.sin(v * 5.6 - u * 2.7 + phase * 0.4) * 0.075
  );
}

type Mote = { u: number; y: number; z: number; speed: number; size: number };

export default function TerrainCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Offscreen buffer for the bloom pass.
    const glow = document.createElement("canvas");
    const gctx = glow.getContext("2d");
    if (!gctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let phase = 0;
    let last = performance.now();

    // Deterministic motes — no Math.random on first paint, so a reload
    // never produces a visibly different composition.
    const motes: Mote[] = Array.from({ length: 46 }, (_, i) => {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      const r1 = s - Math.floor(s);
      const s2 = Math.sin(i * 78.233) * 12345.6789;
      const r2 = s2 - Math.floor(s2);
      return {
        u: r1,
        y: r2,
        z: 0.25 + r1 * 0.7,
        speed: 0.004 + r2 * 0.012,
        size: 0.6 + r2 * 1.5,
      };
    });

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = parent.clientWidth;
      H = parent.clientHeight;
      canvas!.width = Math.max(1, Math.floor(W * dpr));
      canvas!.height = Math.max(1, Math.floor(H * dpr));
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      // Bloom buffer runs at half resolution — it is blurred anyway, and
      // this keeps the second pass cheap.
      glow.width = Math.max(1, Math.floor((W * dpr) / 2));
      glow.height = Math.max(1, Math.floor((H * dpr) / 2));
    }

    // Projects grid coordinates into screen space with a simple
    // perspective divide, so rows compress toward the horizon.
    function project(u: number, v: number, phase: number) {
      const depth = 0.24 + v * v * 1.9;
      const horizon = H * 0.3;
      const y = horizon + (H * 0.78 * v * v) / 1.0;
      const spread = 0.42 + v * 1.05;
      const x = W * (0.5 + (u - 0.5) * spread);
      const lift = heightAt(u, v, phase) * H * 0.2 * (0.18 + v);
      // Settle toward the edges so it reads as a dune, not a sheet.
      const falloff = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 1.35);
      return { x, y: y - lift * falloff, depth, falloff };
    }

    function draw(now: number) {
      const dt = Math.min(48, now - last);
      last = now;
      if (!reduced) phase += dt * 0.00016;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      gctx!.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0);
      gctx!.clearRect(0, 0, W, H);

      // ---- volumetric shafts -------------------------------------------------
      // Drawn into the glow buffer only; the bloom pass is what sells them.
      const beams = [0.3, 0.375, 0.44, 0.5, 0.565, 0.64, 0.72];
      for (let i = 0; i < beams.length; i++) {
        const u = beams[i];
        const p = project(u, 0.42, phase);
        const centrality = 1 - Math.abs(u - 0.5) * 1.55;
        const a = Math.max(0.05, 0.45 * centrality);
        const top = p.y - H * 0.31;
        const g = gctx!.createLinearGradient(0, top, 0, p.y + 6);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.72, `rgba(255,255,255,${a * 0.5})`);
        g.addColorStop(1, `rgba(255,255,255,${a})`);
        gctx!.fillStyle = g;
        gctx!.fillRect(p.x - 0.9, top, 1.8, p.y - top + 6);
      }

      // ---- ridge bloom -------------------------------------------------------
      const centre = project(0.5, 0.5, phase);
      const bloom = gctx!.createRadialGradient(
        centre.x, centre.y, 0,
        centre.x, centre.y, Math.max(W, H) * 0.36
      );
      bloom.addColorStop(0, "rgba(255,255,255,0.075)");
      bloom.addColorStop(0.5, "rgba(255,255,255,0.022)");
      bloom.addColorStop(1, "rgba(255,255,255,0)");
      gctx!.fillStyle = bloom;
      gctx!.fillRect(0, 0, W, H);

      // ---- wireframe ---------------------------------------------------------
      ctx!.lineWidth = 0.6;
      for (let r = 0; r < ROWS; r++) {
        const v = r / (ROWS - 1);
        ctx!.beginPath();
        for (let c = 0; c < COLS; c++) {
          const p = project(c / (COLS - 1), v, phase);
          if (c === 0) ctx!.moveTo(p.x, p.y);
          else ctx!.lineTo(p.x, p.y);
        }
        ctx!.strokeStyle = `rgba(255,255,255,${(0.03 + 0.16 * v) * 0.95})`;
        ctx!.stroke();
      }
      for (let c = 0; c < COLS; c += 2) {
        const u = c / (COLS - 1);
        ctx!.beginPath();
        for (let r = 0; r < ROWS; r++) {
          const p = project(u, r / (ROWS - 1), phase);
          if (r === 0) ctx!.moveTo(p.x, p.y);
          else ctx!.lineTo(p.x, p.y);
        }
        ctx!.strokeStyle = "rgba(255,255,255,0.05)";
        ctx!.stroke();
      }

      // ---- particles on the surface -----------------------------------------
      // Brightness tracks both depth and how high the point sits on the
      // ridge, which is what gives the dune its lit crest.
      for (let r = 0; r < ROWS; r += 1) {
        const v = r / (ROWS - 1);
        for (let c = 0; c < COLS; c += 1) {
          const u = c / (COLS - 1);
          const p = project(u, v, phase);
          const crest = heightAt(u, v, phase) * p.falloff;
          const a = Math.max(0, (0.05 + 0.5 * v) * (0.25 + crest * 0.8));
          if (a < 0.02) continue;
          const s = (0.5 + v * 1.05) * (0.7 + crest * 0.5);
          ctx!.fillStyle = `rgba(255,255,255,${Math.min(0.55, a)})`;
          ctx!.fillRect(p.x, p.y, s, s);
          if (crest > 0.85 && v > 0.3) {
            gctx!.fillStyle = `rgba(255,255,255,${Math.min(0.5, a * 0.8)})`;
            gctx!.fillRect(p.x, p.y, s * 1.6, s * 1.6);
          }
        }
      }

      // ---- floating motes ----------------------------------------------------
      for (const m of motes) {
        if (!reduced) {
          m.y -= m.speed * (dt / 16);
          if (m.y < -0.05) m.y = 1.05;
        }
        const x = W * m.u;
        const y = H * m.y;
        const a = 0.1 + m.z * 0.28;
        ctx!.fillStyle = `rgba(255,255,255,${a})`;
        ctx!.beginPath();
        ctx!.arc(x, y, m.size * 0.55, 0, Math.PI * 2);
        ctx!.fill();
      }

      // ---- bloom composite ---------------------------------------------------
      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.globalCompositeOperation = "lighter";
      // Two passes at different radii: a tight core and a wide halo.
      ctx!.filter = "blur(7px)";
      ctx!.drawImage(glow, 0, 0, canvas!.width, canvas!.height);
      ctx!.filter = "blur(22px)";
      ctx!.globalAlpha = 0.75;
      ctx!.drawImage(glow, 0, 0, canvas!.width, canvas!.height);
      ctx!.filter = "none";
      ctx!.globalAlpha = 1;
      ctx!.restore();

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
      // Repaint immediately so a resize never shows a blank frame.
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
