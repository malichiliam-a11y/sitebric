"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import { t, cardBg } from "@/lib/theme";
import AuthCard from "@/app/components/AuthCard";
import { Wordmark } from "@/app/components/Brand";
import MeshTerrain from "@/app/components/MeshTerrain";
import {
  IconBolt, IconPencil, IconRocket, IconSun, IconStar,
  IconX, IconDiscord, IconGitHub,
} from "@/app/components/Icons";

const features = [
  [IconBolt, "AI-Powered", "Generate complete websites with a simple prompt."],
  [IconPencil, "Fully Customizable", "Edit and personalize every detail to match your brand."],
  [IconRocket, "Launch Instantly", "Publish your website in one click and go live."],
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
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: t.body, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`
        @media (max-width: 1040px) {
          .sb-login-grid { grid-template-columns: 1fr !important; justify-items: center; gap: 0 !important; padding: 0 5% 24px !important; }
          .sb-login-copy { display: none !important; }
          .sb-login-footer { flex-direction: column !important; gap: 20px !important; text-align: center; }
          .sb-login-footer-links { gap: 24px !important; flex-wrap: wrap; justify-content: center; }
          .sb-mesh-wrap { opacity: 0.4 !important; }
        }
        @media (max-width: 720px) {
          .sb-login-nav { padding: 22px 6% !important; }
          .sb-login-nav-links { gap: 20px !important; }
          .sb-login-nav-links a { display: none; }
        }
      `}</style>

      {/* Ambient art layer */}
      <div className="sb-mesh-wrap" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: "15%",
            right: "40%",
            top: "30%",
            bottom: "7%",
          }}
        >
          <MeshTerrain style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 46% 56%, rgba(255,255,255,0.06) 0%, transparent 46%), radial-gradient(circle at 88% 40%, rgba(255,255,255,0.03) 0%, transparent 40%)",
          }}
        />
      </div>

      <nav className="sb-login-nav" style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 8.8% 30px 6.2%" }}>
        <Wordmark size={24} />
        <div className="sb-login-nav-links" style={{ display: "flex", alignItems: "center", gap: 36, fontSize: 14.5 }}>
          <a href="/#how-it-works" style={{ color: t.textMuted, textDecoration: "none" }}>Documentation</a>
          <a href="mailto:supportsitebric@gmail.com" style={{ color: t.textMuted, textDecoration: "none" }}>Contact</a>
          {/* Decorative: the app is dark-only today, so this deliberately
              isn't wired to a handler rather than pretending to toggle. */}
          <span
            title="Light mode isn't available yet"
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              border: `1px solid ${t.border}`,
              background: t.bgPanel,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textMuted,
            }}
          >
            <IconSun size={17} />
          </span>
        </div>
      </nav>

      <div
        className="sb-login-grid"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          width: "100%",
          padding: "0 8.8% 30px 6.2%",
          rowGap: 0,
          display: "grid",
          gridTemplateColumns: "1fr 596px",
          gap: 56,
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div className="sb-login-copy">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.78)",
              border: `1px solid ${t.border}`,
              borderRadius: 999,
              padding: "9px 18px",
              marginBottom: 34,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.65)" }} />
            AI-POWERED PLATFORM
          </div>

          <h1 style={{ fontFamily: t.display, fontWeight: 700, fontSize: "clamp(36px, 3.7vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.035em", margin: "0 0 30px" }}>
            Build stunning
            <br />
            websites in
            <br />
            <span style={{ color: "rgba(255,255,255,0.38)" }}>seconds.</span>
          </h1>

          <p style={{ fontSize: 15.5, color: t.textMuted, lineHeight: 1.75, maxWidth: 396, margin: "0 0 44px" }}>
            Sitebric is the AI-powered platform that helps you generate, customize, and launch professional
            websites — faster than ever.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 28, marginBottom: 50 }}>
            {features.map(([Icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    flexShrink: 0,
                    borderRadius: 13,
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.text,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div style={{ paddingTop: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.55, maxWidth: 236 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 22,
              borderRadius: 14,
              padding: "22px 26px",
              background: cardBg,
              border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: "flex" }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    marginLeft: i === 0 ? 0 : -13,
                    border: "2px solid #101010",
                    background: `linear-gradient(140deg, rgba(255,255,255,${0.3 - i * 0.05}), rgba(255,255,255,0.07))`,
                  }}
                />
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 3, color: "rgba(255,255,255,0.9)", marginBottom: 9 }}>
                {[0, 1, 2, 3, 4].map((i) => <IconStar key={i} size={14} />)}
              </div>
              <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, maxWidth: 208 }}>
                Trusted by creators and businesses to build the future of the web.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <AuthCard />
        </div>
      </div>

      <footer
        className="sb-login-footer"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "28px 8.8% 28px 6.2%",
          fontSize: 13.5,
          color: t.textFaint,
        }}
      >
        <span>© {new Date().getFullYear()} Sitebric. All rights reserved.</span>
        <div className="sb-login-footer-links" style={{ display: "flex", gap: 46 }}>
          <a href="/terms" style={{ color: t.textMuted, textDecoration: "none" }}>Terms of Service</a>
          <a href="/privacy" style={{ color: t.textMuted, textDecoration: "none" }}>Privacy Policy</a>
          <a href="mailto:supportsitebric@gmail.com" style={{ color: t.textMuted, textDecoration: "none" }}>Contact Us</a>
        </div>
        <div style={{ display: "flex", gap: 22, color: t.textMuted }}>
          <IconX size={17} />
          <IconDiscord size={18} />
          <IconGitHub size={18} />
        </div>
      </footer>
    </div>
  );
}
