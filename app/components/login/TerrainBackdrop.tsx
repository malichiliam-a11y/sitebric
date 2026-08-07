"use client";

import { motion, useReducedMotion } from "framer-motion";
import TerrainField from "./TerrainField";
import ParticleField from "./ParticleField";
import { palette } from "@/lib/design";

/**
 * The login backdrop, in layers back to front:
 *
 *  1. the supplied render, faded out below its horizon so only its haze
 *     and light shafts contribute — its own terrain would double up with
 *     the live one drawn over it
 *  2. a slow luminance pulse across those shafts
 *  3. TerrainField, the actual moving landform
 *  4. drifting motes
 *  5. edge veils that keep the copy and the card legible
 *
 * Splitting it this way is what lets the mountains move: the render
 * supplies atmosphere it would be expensive to fake, and the canvas
 * supplies motion a still cannot have.
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
          inset: -3%;
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
          background-position: 34% 40%;
          opacity: 0.85;
          /* Keep the sky and shafts, drop the render's own landform so it
             does not sit behind the live terrain as a ghost. */
          -webkit-mask-image: linear-gradient(180deg,
            #000 0%, #000 34%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 62%);
          mask-image: linear-gradient(180deg,
            #000 0%, #000 34%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 62%);
        }

        .sb-backdrop-terrain,
        .sb-backdrop-motes {
          position: absolute; inset: 0; width: 100%; height: 100%;
        }

        @keyframes sbShimmer {
          0%, 100% { opacity: 0.08; }
          50%      { opacity: 0.42; }
        }
        .sb-backdrop-shimmer {
          position: absolute; inset: 0;
          background: radial-gradient(48% 42% at 36% 24%,
            rgba(255,255,255,0.075) 0%, transparent 70%);
          animation: sbShimmer 13s ease-in-out infinite;
        }

        .sb-backdrop-veil {
          position: absolute; inset: 0;
          background:
            linear-gradient(90deg,
              ${palette.bg} 0%,
              rgba(0,0,0,0.9) 10%,
              rgba(0,0,0,0.62) 20%,
              rgba(0,0,0,0.25) 31%,
              rgba(0,0,0,0) 42%),
            linear-gradient(270deg,
              ${palette.bg} 0%,
              rgba(0,0,0,0.88) 10%,
              rgba(0,0,0,0.42) 21%,
              rgba(0,0,0,0) 34%),
            linear-gradient(0deg,
              ${palette.bg} 0%,
              rgba(0,0,0,0.5) 7%,
              rgba(0,0,0,0) 22%),
            linear-gradient(180deg,
              rgba(0,0,0,0.55) 0%,
              rgba(0,0,0,0) 16%);
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-backdrop-shimmer { animation: none; opacity: 0.24; }
        }
        @media (max-width: 1040px) {
          .sb-backdrop-img { background-position: 40% 45%; opacity: 0.5; }
          .sb-backdrop-terrain { opacity: 0.55; }
        }
      `,
        }}
      />

      <motion.div
        className="sb-backdrop-img"
        initial={reduced ? undefined : { scale: 1.03, x: -10 }}
        animate={reduced ? undefined : { scale: 1.08, x: 12 }}
        transition={
          reduced
            ? undefined
            : { duration: 48, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
        }
      />
      <div className="sb-backdrop-shimmer" />
      <TerrainField className="sb-backdrop-terrain" />
      <ParticleField className="sb-backdrop-motes" />
      <div className="sb-backdrop-veil" />
    </div>
  );
}
