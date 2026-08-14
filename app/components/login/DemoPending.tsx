"use client";

import { useState } from "react";
import { palette } from "@/lib/design";

// A generation's real duration depends on how detailed the brief is —
// there's no way to know the true total in advance, so this counts down
// from a rough estimate rather than up from zero, which is what was
// actually asked for: an ETA, not a stopwatch. Once elapsed time passes
// the estimate (a large/detailed brief can genuinely run longer), it
// switches to "almost done" instead of sitting at 0:00 or going negative,
// which would read as broken.
const ESTIMATE_SECONDS = 150;

// Shared between the hero panel, the standalone /demo page, and the
// /demo/result/[jobId] page a visitor lands on if they come back later —
// same live countdown and "safe to close this tab" message in all three.
export default function DemoPending({ elapsed, jobUrl }: { elapsed: number; jobUrl: string }) {
  const [copied, setCopied] = useState(false);
  const remaining = Math.max(0, ESTIMATE_SECONDS - elapsed);
  const almostDone = elapsed >= ESTIMATE_SECONDS;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: almostDone ? 20 : 34,
          fontWeight: 700,
          color: palette.text,
          marginBottom: 10,
        }}
      >
        {almostDone ? "Almost done…" : timeStr}
      </div>
      <div style={{ fontSize: 13.5, color: palette.textMuted, marginBottom: 24, lineHeight: 1.5 }}>
        {almostDone
          ? "This one's taking a bit longer than usual — still working on it."
          : "Estimated time remaining — a detailed brief can take longer."}
      </div>
      <div style={{ fontSize: 12, color: palette.textGhost, marginBottom: 8 }}>
        Safe to close this tab. Come back anytime at:
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          navigator.clipboard?.writeText(jobUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12.5,
          color: palette.text,
          background: palette.input,
          border: `1px solid ${palette.hairlineStrong}`,
          borderRadius: 8,
          padding: "9px 14px",
          cursor: "pointer",
          maxWidth: "100%",
          wordBreak: "break-all",
        }}
      >
        {copied ? "Copied!" : jobUrl}
      </div>
    </div>
  );
}
