"use client";

import { motion, useReducedMotion } from "framer-motion";
import ParticleField from "./ParticleField";
import { palette } from "@/lib/design";

/**
 * The login backdrop.
 *
 * This used to be a procedural Canvas approximation of the reference
 * art. It is now the real asset, which is both exact and far cheaper —
 * the canvas ran a full redraw every frame; this is a 114KB image.
 *
 * The source render is terrain on the left with clear black on the
 * right, which is exactly the composition the layout wants: copy over
 * the terrain, card over the clear side.
 */
export default function TerrainBackdrop() {
  const reduced = useReducedMotion();

  return (
    <div className="sb-backdrop" aria-hidden="true">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sb-backdrop { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }

        .sb-backdrop-img {
          position: absolute;
          inset: -2% -2% -2% -2%;
          background-image: image-set(
            url("/login-terrain.webp") 2x,
            url("/login-terrain-sm.webp") 1x
          );
          background-image: -webkit-image-set(
            url("/login-terrain.webp") 2x,
            url("/login-terrain-sm.webp") 1x
          );
          background-repeat: no-repeat;
          background-size: cover;
          background-position: 34% 58%;
        }

        /* Keeps the headline and the card off the busiest part of the
           render, the same way the reference composition does. */
        .sb-backdrop-veil {
          position: absolute; inset: 0;
          background:
            linear-gradient(90deg,
              ${palette.bg} 0%,
              rgba(5,5,5,0.9) 10%,
              rgba(5,5,5,0.62) 20%,
              rgba(5,5,5,0.25) 31%,
              rgba(5,5,5,0) 42%),
            linear-gradient(270deg,
              ${palette.bg} 0%,
              rgba(5,5,5,0.88) 10%,
              rgba(5,5,5,0.42) 21%,
              rgba(5,5,5,0) 34%),
            linear-gradient(0deg,
              ${palette.bg} 0%,
              rgba(5,5,5,0.55) 7%,
              rgba(5,5,5,0) 20%),
            linear-gradient(180deg,
              rgba(5,5,5,0.6) 0%,
              rgba(5,5,5,0) 16%);
        }

        .sb-backdrop-motes {
          position: absolute; inset: 0; width: 100%; height: 100%;
        }

        /* A slow luminance pulse across the shafts, so the light in the
           render reads as live rather than frozen. */
        @keyframes sbShimmer {
          0%, 100% { opacity: 0.0; }
          50%      { opacity: 0.5; }
        }
        .sb-backdrop-shimmer {
          position: absolute; inset: 0;
          background: radial-gradient(46% 40% at 33% 26%,
            rgba(255,255,255,0.07) 0%, transparent 70%);
          animation: sbShimmer 11s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-backdrop-shimmer { animation: none; opacity: 0.22; }
        }

        @media (max-width: 1040px) {
          .sb-backdrop-img { background-position: 40% 70%; opacity: 0.55; }
        }
      `,
        }}
      />
      {/* A very slow drift keeps it from reading as a flat JPEG without
          ever being noticeable as motion. Disabled under reduced-motion. */}
      <motion.div
        className="sb-backdrop-img"
        initial={reduced ? undefined : { scale: 1.04, x: -14, y: 6 }}
        animate={reduced ? undefined : { scale: 1.09, x: 16, y: -10 }}
        transition={
          reduced
            ? undefined
            : { duration: 42, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
        }
      />
      <div className="sb-backdrop-shimmer" />
      <ParticleField className="sb-backdrop-motes" />
      <div className="sb-backdrop-veil" />
    </div>
  );
}
