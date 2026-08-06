"use client";

import type { ReactNode, CSSProperties } from "react";
import { palette } from "@/lib/design";

/* ---------------------------------------------------------------- icons */
/* Thin outline set, 1.6 stroke, sized to the reference. */

type IconProps = { size?: number; className?: string };

function Outline({ size = 18, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconBolt = (p: IconProps) => (
  <Outline {...p}>
    <path d="M13.4 3 6.2 13.4h4.9L10.6 21l7.2-10.4h-4.9L13.4 3Z" />
  </Outline>
);

export const IconPencil = (p: IconProps) => (
  <Outline {...p}>
    <path d="M16.4 3.9a2.05 2.05 0 0 1 2.9 2.9L8.5 17.6l-3.9 1 1-3.9L16.4 3.9Z" />
  </Outline>
);

export const IconRocket = (p: IconProps) => (
  <Outline {...p}>
    <path d="M13.6 4.4c3.3-1.7 5.9-1.2 5.9-1.2s.5 2.6-1.2 5.9c-1.4 2.7-3.9 4.9-6.4 6.2L8.5 12c1.3-2.5 3.4-5 6.1-6.4" />
    <path d="M8.5 12 6.2 14.3l3.4 3.4 2.3-2.3" />
    <circle cx="15.1" cy="8.8" r="1.35" />
  </Outline>
);

export const IconMail = (p: IconProps) => (
  <Outline {...p}>
    <rect x="2.5" y="4.75" width="19" height="14.5" rx="2.4" />
    <path d="m3.6 6.6 8.4 5.9 8.4-5.9" />
  </Outline>
);

export const IconEye = (p: IconProps) => (
  <Outline {...p}>
    <path d="M2 12s3.8-6.9 10-6.9S22 12 22 12s-3.8 6.9-10 6.9S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Outline>
);

export const IconEyeOff = (p: IconProps) => (
  <Outline {...p}>
    <path d="M17.9 17.9A10.3 10.3 0 0 1 12 19.5C5.8 19.5 2 12 2 12a18.5 18.5 0 0 1 5.1-5.9m2.8-1.3A10.3 10.3 0 0 1 12 4.5c6.2 0 10 7.5 10 7.5a18.4 18.4 0 0 1-2.2 3.2m-6.6-1a2.75 2.75 0 1 1-3.9-3.9" />
    <path d="m2 2 20 20" />
  </Outline>
);

export const IconArrowRight = (p: IconProps) => (
  <Outline {...p}>
    <path d="M4.5 12h14" />
    <path d="m12.8 6.2 5.8 5.8-5.8 5.8" />
  </Outline>
);

export const IconSun = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="3.9" />
    <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5" />
  </Outline>
);

export const IconStar = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z" />
  </svg>
);

export const IconX = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 3h3.1l-6.8 7.7L21.8 21h-6.2l-4.9-6.4L5.1 21H2l7.2-8.3L2.5 3h6.4l4.4 5.8L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z" />
  </svg>
);

export const IconDiscord = ({ size = 17 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.3 5.6A16 16 0 0 0 15.4 4.4l-.2.4c1.3.3 2.4.8 3.4 1.5-1.7-.9-3.4-1.4-5.6-1.4s-3.9.5-5.6 1.4c1-.6 2.2-1.2 3.4-1.5l-.2-.4a16 16 0 0 0-3.9 1.2C3.2 9 2.4 13.1 2.7 17.3A16.3 16.3 0 0 0 7.6 19.8l1-1.7c-.8-.3-1.6-.7-2.3-1.2l.5-.4c2.1 1 4.3 1.5 6.4 1.5s4.3-.5 6.4-1.5l.5.4c-.7.5-1.5.9-2.3 1.2l1 1.7a16.3 16.3 0 0 0 4.9-2.5c.4-4.9-.8-8.9-3.4-11.7ZM9.2 14.9c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
  </svg>
);

export const IconGitHub = ({ size = 17 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  </svg>
);

export const IconGoogle = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
  </svg>
);

/* ---------------------------------------------------------------- brand */

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M15.5 3H29L17.5 14H4L15.5 3Z" fill="currentColor" />
      <path d="M14.5 18H28L16.5 29H3L14.5 18Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 23 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11, color: palette.text }}>
      <LogoMark size={size + 5} />
      <span style={{ fontWeight: 500, fontSize: size, letterSpacing: "-0.025em" }}>sitebric</span>
    </span>
  );
}

/* ------------------------------------------------------------ film grain */

// Monochrome fractal noise, inlined so it costs no extra request.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function FilmGrain({ opacity = 0.035, style }: { opacity?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4,
        pointerEvents: "none",
        opacity,
        backgroundImage: GRAIN,
        ...style,
      }}
    />
  );
}
