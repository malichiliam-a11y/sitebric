"use client";

import { useState } from "react";
import { palette } from "@/lib/design";

// Shared between the hero panel, the standalone /demo page, and the
// /demo/result/[jobId] page a visitor lands on if they come back later —
// same live timer and "safe to close this tab" message in all three.
export default function DemoPending({ elapsed, jobUrl }: { elapsed: number; jobUrl: string }) {
  const [copied, setCopied] = useState(false);
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const timeStr = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: 34,
          fontWeight: 700,
          color: palette.text,
          marginBottom: 10,
        }}
      >
        {timeStr}
      </div>
      <div style={{ fontSize: 13.5, color: palette.textMuted, marginBottom: 24, lineHeight: 1.5 }}>
        Building your site — a detailed brief can take a few minutes.
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
