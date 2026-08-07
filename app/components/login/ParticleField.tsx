"use client";

import { useEffect, useRef } from "react";

/**
 * A light drifting mote layer over the terrain render.
 *
 * The render itself is a still, so this is what makes the backdrop feel
 * alive without giving up the fidelity of using the real art. Motes
 * rise slowly, twinkle, and wrap — roughly 70 of them, which is cheap
 * enough to stay smooth on a phone.
 *
 * Seeded deterministically so the first frame is identical on every
 * load. Pauses when the tab is hidden and does not run at all under
 * prefers-reduced-motion.
 */

type Mote = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  twinkle: number;
  alpha: number;
};

const COUNT = 70;

// Deterministic pseudo-random so server and client agree and reloads
// do not reshuffle the composition.
function rand(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export default function ParticleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let motes: Mote[] = [];

    function seed() {
      motes = Array.from({ length: COUNT }, (_, i) => ({
        x: rand(i, 1) * W,
        y: rand(i, 2) * H,
        r: 0.4 + rand(i, 3) * 1.3,
        speed: 3 + rand(i, 4) * 11,
        drift: (rand(i, 5) - 0.5) * 5,
        phase: rand(i, 6) * Math.PI * 2,
        twinkle: 0.4 + rand(i, 7) * 1.1,
        alpha: 0.12 + rand(i, 8) * 0.4,
      }));
    }

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
      seed();
    }

    function draw(now: number) {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);

      for (const m of motes) {
        m.y -= m.speed * dt;
        m.x += m.drift * dt;
        m.phase += m.twinkle * dt;

        if (m.y < -6) {
          m.y = H + 6;
          m.x = rand(Math.floor(m.x + m.y), 9) * W;
        }
        if (m.x < -6) m.x = W + 6;
        if (m.x > W + 6) m.x = -6;

        // Fade toward the top so motes dissolve rather than pop out.
        const vertical = Math.min(1, m.y / (H * 0.35));
        const a = m.alpha * (0.55 + 0.45 * Math.sin(m.phase)) * vertical;
        if (a <= 0.01) continue;

        ctx!.beginPath();
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${a})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(draw);
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    }

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    resize();
    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
