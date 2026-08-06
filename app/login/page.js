"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import { t, type, cardBg } from "@/lib/theme";
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

// Monochrome fractal noise, inlined so the grain costs no extra request.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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
    <div className="sb-login">
      <style dangerouslySetInnerHTML={{ __html: `
        .sb-login {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          background: ${t.bg};
          color: ${t.text};
          font-family: ${t.body};
          -webkit-font-smoothing: antialiased;
        }
        /* Film grain. Fixed so it does not crawl with scroll, and low
           enough that it only reads as texture on the flat black. */
        .sb-login::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          opacity: 0.032;
          background-image: ${GRAIN};
        }

        .sb-nav-link {
          color: ${t.textMuted};
          text-decoration: none;
          transition: color 160ms ${t.ease};
        }
        .sb-nav-link:hover { color: ${t.text}; }

        .sb-toggle {
          width: 40px; height: 40px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.bgPanel};
          display: flex; align-items: center; justify-content: center;
          color: ${t.textMuted};
        }

        .sb-tile {
          width: 48px; height: 48px; flex-shrink: 0;
          border-radius: 12px;
          border: 1px solid ${t.border};
          background: ${t.bgCard};
          display: flex; align-items: center; justify-content: center;
          color: ${t.text};
          transition: border-color 200ms ${t.ease};
        }
        .sb-feature:hover .sb-tile { border-color: ${t.borderHover}; }

        @media (prefers-reduced-motion: reduce) {
          .sb-nav-link, .sb-tile { transition: none; }
        }
        @media (max-width: 1040px) {
          .sb-grid { grid-template-columns: 1fr !important; justify-items: center; padding: 0 5% 28px !important; }
          .sb-copy { display: none !important; }
          .sb-footer { flex-direction: column !important; gap: 20px !important; text-align: center; }
          .sb-footer-links { gap: 26px !important; flex-wrap: wrap; justify-content: center; }
          .sb-art { opacity: 0.5 !important; }
        }
        @media (max-width: 720px) {
          .sb-nav { padding: 22px 6% !important; }
          .sb-nav-link { display: none; }
        }
      ` }} />

      {/* Ambient art. Sits under everything and stays out of the way. */}
      <div className="sb-art" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "14%", right: "40%", top: "30%", bottom: "6%" }}>
          <MeshTerrain style={{ width: "100%", height: "100%" }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(60% 50% at 45% 55%, rgba(255,255,255,0.035) 0%, transparent 100%)",
          }}
        />
      </div>

      <nav
        className="sb-nav"
        style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 8.8% 30px 6.2%" }}
      >
        <Wordmark size={23} />
        <div style={{ display: "flex", alignItems: "center", gap: 34, fontSize: 14.5 }}>
          <a className="sb-nav-link" href="/#how-it-works">Documentation</a>
          <a className="sb-nav-link" href="mailto:supportsitebric@gmail.com">Contact</a>
          {/* Decorative: the app is dark-only, so this is rendered without
              a handler rather than pretending to switch themes. */}
          <span className="sb-toggle" title="Light mode isn't available yet">
            <IconSun size={17} />
          </span>
        </div>
      </nav>

      <div
        className="sb-grid"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          padding: "0 8.8% 30px 6.2%",
          display: "grid",
          gridTemplateColumns: "1fr 596px",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div className="sb-copy">
          <div
            style={{
              ...type.micro,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              color: t.textMuted,
              border: `1px solid ${t.border}`,
              borderRadius: 999,
              padding: "8px 16px",
              marginBottom: 36,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.textMuted }} />
            AI-POWERED PLATFORM
          </div>

          <h1 style={{ ...type.display, fontSize: "clamp(36px, 3.7vw, 56px)", margin: "0 0 28px", color: t.text }}>
            Build stunning
            <br />
            websites in
            <br />
            <span style={{ color: t.textFaint }}>seconds.</span>
          </h1>

          <p style={{ ...type.bodyLg, color: t.textMuted, maxWidth: 392, margin: "0 0 44px" }}>
            Sitebric is the AI-powered platform that helps you generate, customize, and launch professional
            websites — faster than ever.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginBottom: 48 }}>
            {features.map(([Icon, title, desc]) => (
              <div key={title} className="sb-feature" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <span className="sb-tile"><Icon size={19} /></span>
                <div style={{ paddingTop: 3 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 5, color: t.text }}>
                    {title}
                  </div>
                  <div style={{ ...type.small, color: t.textMuted, lineHeight: 1.55, maxWidth: 232 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
              borderRadius: 14,
              padding: "20px 24px",
              background: cardBg,
              border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: "flex" }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    marginLeft: i === 0 ? 0 : -12,
                    border: `2px solid ${t.bgCard}`,
                    background: `linear-gradient(140deg, rgba(255,255,255,${0.24 - i * 0.04}), rgba(255,255,255,0.06))`,
                  }}
                />
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 3, color: t.textMuted, marginBottom: 8 }}>
                {[0, 1, 2, 3, 4].map((i) => <IconStar key={i} size={12} />)}
              </div>
              <div style={{ ...type.small, color: t.textMuted, lineHeight: 1.5, maxWidth: 228 }}>
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
        className="sb-footer"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "28px 8.8% 28px 6.2%",
          ...type.small,
          color: t.textFaint,
        }}
      >
        <span>© {new Date().getFullYear()} Sitebric. All rights reserved.</span>
        <div className="sb-footer-links" style={{ display: "flex", gap: 44 }}>
          <a className="sb-nav-link" href="/terms">Terms of Service</a>
          <a className="sb-nav-link" href="/privacy">Privacy Policy</a>
          <a className="sb-nav-link" href="mailto:supportsitebric@gmail.com">Contact Us</a>
        </div>
        <div style={{ display: "flex", gap: 20, color: t.textFaint }}>
          <IconX size={16} />
          <IconDiscord size={17} />
          <IconGitHub size={17} />
        </div>
      </footer>
    </div>
  );
}
