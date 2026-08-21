"use client";

import LapsedBanner from "../../dashboard/LapsedBanner";
import { lapsedNotice, GRACE_DAYS } from "@/lib/entitlements";

// Real dates fed through the real lapsedNotice(), so the harness cannot
// show a sentence the product would never produce.
const NOW = new Date("2026-08-20T12:00:00Z");
const ago = (days) => new Date(NOW.getTime() - days * 86400000);

const CASES = {
  active: { plan: "growth", planEndedAt: null },
  grace: { plan: "none", planEndedAt: ago(1) },
  lastday: { plan: "none", planEndedAt: ago(GRACE_DAYS - 0.5) },
  expired: { plan: "none", planEndedAt: ago(10) },
};

export default function Harness({ state }) {
  const c = CASES[state] || CASES.grace;
  const notice = lapsedNotice({ ...c, now: NOW });
  return (
    <div id="harness" style={{ background: "#0A0A10", minHeight: "100vh", color: "#fff" }}>
      <LapsedBanner notice={notice} onFix={() => {}} />
      <div style={{ padding: 24, fontFamily: "system-ui", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
        {notice ? `state: ${notice.state}` : "state: active — no banner, which is correct"}
      </div>
    </div>
  );
}
