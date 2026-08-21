"use client";

import { createPortal } from "react-dom";
import { PLAN_LIMITS } from "@/lib/plans";

// The confirmation after a plan changes on an existing subscription.
//
// Its own file so it can be driven in a browser without a login — the
// rest of the dashboard needs a Supabase session before it draws a pixel,
// and this repo has been caught by exactly this kind of thing before:
// position:fixed resolves against the nearest ancestor with a transform
// or filter, and the dashboard shell has several, so it is portalled to
// document.body rather than rendered in place.
//
// It exists because upgrading now happens silently. There is no Stripe
// checkout page to pass through, so without this the customer clicks
// "Scale up", lands back on a dashboard that looks identical, and has no
// idea whether they were charged or what for.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

export default function PlanChangedBanner({ plan, onDismiss }) {
  if (!plan || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="status"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        maxWidth: "min(520px, calc(100vw - 32px))",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: "#101018",
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontFamily: BODY,
        color: "#fff",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1.4 }}>✅</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: DISPLAY, fontWeight: 700, fontSize: 13.5 }}>
          You&apos;re on {PLAN_LIMITS[plan]?.label || plan} now
        </span>
        {/* Says where the money went. A plan change bills only the
            difference, and someone who just clicked an upgrade is owed
            that sentence before they go looking for it. */}
        <span
          style={{
            display: "block",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.7)",
            marginTop: 2,
          }}
        >
          Your subscription was switched over, not started again — you were only charged the
          difference for the rest of this month. The new limits are live already.
        </span>
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8,
          width: 26,
          height: 26,
          color: "#fff",
          cursor: "pointer",
          lineHeight: 1,
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>,
    document.body
  );
}
