import OrbDemo from "./OrbDemo";
import { DEMO_BUSINESS } from "@/lib/demo-chat";
import { receptionistLocked, lockedNotice } from "@/lib/feature-lock";

export const metadata = {
  title: "Try the AI receptionist — Sitebric",
  description:
    "Talk to the AI receptionist in your browser. No signup, no phone call. Ask it a price, then ask it something it wasn't told.",
};

// Public, no login, no signup. That is the entire point.
//
// Most people who sign up never ring the demo phone line, so most people
// never hear the thing they are being asked to sell. A page you can talk
// to is a different proposition from a phone number you have to dial.
export default function TryPage() {
  const locked = receptionistLocked();
  const notice = lockedNotice();

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#07070B",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px 64px",
        gap: 30,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* A faint horizon behind the orb, so it sits in something rather
          than floating on flat black. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 70% at 50% 42%, rgba(120,140,180,0.14) 0%, rgba(10,10,16,0) 62%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 640 }}>
        <h1
          style={{
            fontSize: "clamp(26px, 4.4vw, 40px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "0 0 10px",
          }}
        >
          Talk to the receptionist
        </h1>
        {!locked && (
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
            This is the same assistant that answers your clients&apos; phones. It&apos;s standing in
            for {DEMO_BUSINESS} — ask it a price, then ask it something it wasn&apos;t told.
          </p>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
        {locked ? (
          <div
            style={{
              maxWidth: 520,
              textAlign: "center",
              padding: "26px 24px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{notice.title}</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
              {notice.body}
            </p>
          </div>
        ) : (
          <OrbDemo autoFocus />
        )}
      </div>

      <a
        href="/dashboard"
        style={{
          position: "relative",
          fontSize: 13.5,
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          textDecoration: "none",
          borderBottom: "1px solid rgba(255,255,255,0.25)",
          paddingBottom: 2,
        }}
      >
        Set one up for a real business →
      </a>
    </main>
  );
}
