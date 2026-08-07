"use client";

import ParticleField from "@/app/components/login/ParticleField";

/**
 * The dashboard's ambient light layer.
 *
 * The workspace used to sit on flat grey with two blurred blobs, which
 * read as static and dull next to the login screen. This adds the same
 * living light: drifting white motes, a slow specular sweep, and two
 * tightened glow pools.
 *
 * Everything here is decorative and non-interactive — it sits at z-index
 * 0 behind the content and never takes pointer events. Motion is dropped
 * under prefers-reduced-motion.
 */
export default function DashAmbient() {
  return (
    <div className="sb-dash-ambient" aria-hidden="true">
      <div className="sb-dash-orb sb-dash-orb-a" />
      <div className="sb-dash-orb sb-dash-orb-b" />
      <div className="sb-dash-beam" />
      <ParticleField className="sb-dash-motes" />
    </div>
  );
}
