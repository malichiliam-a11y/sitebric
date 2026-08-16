"use client";

import { useEffect, useState } from "react";

// A generation gives no progress signal — the model streams for however
// long it streams and there is no percentage to report. So this counts
// down from an estimate rather than up from zero, which is what someone
// waiting actually wants to know: how much longer, not how long so far.
//
// Same approach as DemoPending on the marketing side, and the same rule
// about the estimate running out: a countdown that hits 0:00 while the
// thing is still working reads as broken or frozen, which is worse than
// showing nothing. Past the estimate it stops counting and says so.
//
// The numbers are deliberately a little pessimistic. Finishing early
// reads as fast; overrunning reads as stuck.
const ESTIMATE_SINGLE = 120;
const ESTIMATE_MULTI = 260;

export default function GeneratingProgress({ startedAt, multiPage, accent, body }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const estimate = multiPage ? ESTIMATE_MULTI : ESTIMATE_SINGLE;
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = Math.max(0, estimate - elapsed);
  const overrun = elapsed >= estimate;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;

  // The bar tracks the estimate, capped at 100% — it never reverses and
  // never claims to be finished before the site is actually saved.
  const pct = Math.min(100, Math.round((elapsed / estimate) * 100));

  return (
    <div
      style={{
        marginTop: 14,
        padding: "16px 16px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        fontFamily: body,
        textAlign: "center",
      }}
      aria-live="polite"
    >
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: overrun ? 17 : 30,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {overrun ? "Almost done…" : timeStr}
      </div>

      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.5 }}>
        {overrun
          ? "This one's running longer than usual — still working on it."
          : multiPage
            ? "Estimated time left — four pages take longer than one."
            : "Estimated time left — a detailed brief can take longer."}
      </div>

      <div
        style={{
          height: 5,
          width: "100%",
          borderRadius: 999,
          background: "rgba(255,255,255,0.09)",
          overflow: "hidden",
          marginBottom: 10,
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: accent,
            borderRadius: 999,
            transition: "width 1s linear",
          }}
        />
      </div>

      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
        Safe to leave this page — it keeps building and will be waiting in your sites.
      </div>
    </div>
  );
}
