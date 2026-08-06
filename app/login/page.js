"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import AuthCard from "@/app/components/AuthCard";

const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
const display = "'Space Grotesk', sans-serif";
const body = "'Inter', sans-serif";

const features = [
  ["⚡", "AI-Powered", "Generate a complete client website from a one-line brief."],
  ["✎", "Fully Customizable", "Edit anything after the fact — just describe the change."],
  ["🚀", "Launch Instantly", "Publish live, or hand off the code — either way, in one click."],
];

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    captureReferralCode();
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.push("/dashboard");
    })();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A10", color: "#F2F0FA", fontFamily: body, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes sbLoginDrift1 { 0%{transform:translate(-50%,0) scale(1);} 50%{transform:translate(-42%,8%) scale(1.15);} 100%{transform:translate(-50%,0) scale(1);} }
        @keyframes sbLoginDrift2 { 0%{transform:translate(0,0) scale(1); opacity:0.35;} 50%{transform:translate(10%,-8%) scale(1.2); opacity:0.6;} 100%{transform:translate(0,0) scale(1); opacity:0.35;} }
        .sb-login-orb { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; }
        .sb-login-orb-a { top:-25%; left:30%; width:900px; height:900px; background:radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(34,211,238,0.1) 45%, transparent 70%); animation: sbLoginDrift1 14s ease-in-out infinite; }
        .sb-login-orb-b { bottom:-20%; right:5%; width:600px; height:600px; background:radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%); animation: sbLoginDrift2 17s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sb-login-orb-a, .sb-login-orb-b { animation: none; } }
        @media (max-width: 900px) { .sb-login-grid { grid-template-columns: 1fr !important; } .sb-login-copy { display: none !important; } }
      `}</style>

      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div className="sb-login-orb sb-login-orb-a" />
        <div className="sb-login-orb sb-login-orb-b" />
      </div>

      <nav
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 6%",
        }}
      >
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 18 }}>
          site
          <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>bric</span>
        </span>
        <a href="/pricing" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
          Pricing
        </a>
      </nav>

      <div
        className="sb-login-grid"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          padding: "60px 6% 80px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 60,
          alignItems: "center",
          minHeight: "calc(100vh - 76px)",
        }}
      >
        <div className="sb-login-copy">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#C4B5FD",
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 999,
              padding: "6px 14px",
              marginBottom: 24,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6" }} />
            Built for website resellers
          </div>
          <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: "clamp(32px, 3.6vw, 46px)", lineHeight: 1.15, marginBottom: 18 }}>
            Build stunning
            <br />
            websites in seconds.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 440, marginBottom: 36 }}>
            Sitebric is the AI platform that helps you generate, customize, and launch client websites — faster
            than ever.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {features.map(([icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontFamily: display, fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: "100%" }}>
          <AuthCard />
        </div>
      </div>
    </div>
  );
}
