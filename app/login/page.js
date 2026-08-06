"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import { t, type } from "@/lib/theme";
import AuthCard from "@/app/components/AuthCard";

const features = [
  ["⚡", "AI-Powered", "Generate complete websites with a simple prompt."],
  ["✎", "Fully Customizable", "Edit and personalize every detail to match your brand."],
  ["🚀", "Launch Instantly", "Publish your website in one click and go live."],
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
    <div style={{ background: t.bg, color: "#fff", minHeight: "100vh", fontFamily: t.body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gridDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 0 120px; }
        }
        .sb-mono-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 30% 70%, black 0%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 60% at 30% 70%, black 0%, transparent 75%);
          animation: gridDrift 8s linear infinite;
          pointer-events: none;
        }
        .sb-nav-link {
          color: ${t.textMuted};
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        .sb-nav-link:hover { color: #fff; }

        @media (prefers-reduced-motion: reduce) {
          .sb-mono-grid { animation: none; }
          .sb-nav-link { transition: none; }
        }
        @media (max-width: 900px) {
          .sb-hero-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          .sb-hero-copy { display: none; }
        }
        @media (max-width: 560px) {
          .sb-nav-links { gap: 20px !important; }
        }
      ` }} />

      {/* ===== NAV ===== */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 6%",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>sitebric</span>
        </div>
        <div className="sb-nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a className="sb-nav-link" href="/#how-it-works">Documentation</a>
          <a className="sb-nav-link" href="mailto:supportsitebric@gmail.com">Contact</a>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <div style={{ position: "relative", padding: "80px 6%", overflow: "hidden" }}>
        <div className="sb-mono-grid" />
        <div
          className="sb-hero-grid"
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 0.85fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          {/* Left: marketing copy */}
          <div className="sb-hero-copy">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                ...type.micro,
                color: t.textMuted,
                background: t.bgSurface,
                border: `1px solid ${t.borderStrong}`,
                borderRadius: 999,
                padding: "6px 14px",
                marginBottom: 24,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
              AI-POWERED PLATFORM
            </div>

            <h1 style={{ ...type.display, marginTop: 0, marginBottom: 20 }}>
              Build stunning websites
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>in seconds.</span>
            </h1>

            <p style={{ ...type.bodyLg, color: t.textSubtle, maxWidth: 460, marginTop: 0, marginBottom: 36 }}>
              Sitebric is the AI-powered platform that helps you generate, customize, and launch professional
              websites — faster than ever.
            </p>

            {features.map(([icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 13, color: t.textFaint, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 28,
                padding: "16px 20px",
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                maxWidth: 460,
              }}
            >
              <div style={{ display: "flex" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#333",
                      border: `2px solid ${t.bg}`,
                      marginLeft: i > 1 ? -10 : 0,
                    }}
                  />
                ))}
              </div>
              <div>
                <div style={{ color: t.gold, fontSize: 12, marginBottom: 2 }}>★★★★★</div>
                <div style={{ fontSize: 12, color: t.textSubtle }}>
                  Trusted by resellers to build the future of the web.
                </div>
              </div>
            </div>
          </div>

          {/* Right: login card — existing auth logic, new styling */}
          <AuthCard />
        </div>
      </div>
    </div>
  );
}
