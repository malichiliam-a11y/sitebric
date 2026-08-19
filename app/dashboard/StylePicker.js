"use client";

import { SITE_STYLES } from "@/lib/site-styles";

// Which look the site comes out in, chosen right before Generate.
//
// A row of chips rather than a dropdown: there are seven of these, the
// choice is visual, and a <select> hides six of them behind a click. The
// point of the control is that a reseller sees the options exist at all —
// before this, every site came out of one prompt and the only way to ask
// for a different look was to know to type it into the brief.
//
// Its own file so it can be rendered in a browser without a login, the
// same reason the lead cards live in one.

const DISPLAY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "'Inter', sans-serif";

export default function StylePicker({ value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: BODY,
            fontSize: 13.5,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          Look
        </span>
        <span style={{ fontFamily: BODY, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Costs nothing extra
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Site style"
        // Grid rather than a wrapping flex row: with flex, an odd number
        // of chips leaves the last one stretched across the whole row,
        // which reads as "this one is different" rather than "this row
        // ran out". auto-fill keeps every chip the same size.
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
          gap: 8,
        }}
      >
        {SITE_STYLES.map((style) => {
          const active = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(style.id)}
              style={{
                textAlign: "left",
                background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 10,
                padding: "9px 12px",
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.5 : 1,
                fontFamily: BODY,
                color: "#FFFFFF",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: DISPLAY,
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 2,
                  color: active ? "#FFFFFF" : "rgba(255,255,255,0.8)",
                }}
              >
                {style.label}
              </span>
              {/* The blurb is what makes the choice make sense — "Bold"
                  alone means nothing to someone selling to a plumber. */}
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: "rgba(255,255,255,0.42)",
                }}
              >
                {style.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
