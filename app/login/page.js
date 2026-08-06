"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import { t, cardBg } from "@/lib/theme";
import AuthCard from "@/app/components/AuthCard";
import { Wordmark } from "@/app/components/Brand";
import { IconBolt, IconPencil, IconRocket } from "@/app/components/Icons";

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
        .sb-mesh {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(circle at 42% 62%, rgba(255,255,255,0.07) 0%, transparent 42%),
            radial-gradient(circle at 8% 12%, rgba(255,255,255,0.04) 0%, transparent 34%);
        }
        /* Faint perspective grid, standing in for the wireframe terrain in
           the reference art without shipping a heavy image asset. */
        .sb-mesh::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 62%;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 46px 46px;
          transform: perspective(340px) rotateX(62deg);
          transform-origin: bottom center;
          mask-image: radial-gradient(ellipse 70% 80% at 50% 100%, #000 10%, transparent 72%);
          -webkit-mask-image: radial-gradient(ellipse 70% 80% at 50% 100%, #000 10%, transparent 72%);
          opacity: 0.7;
        }
        @media (max-width: 980px) {
          .sb-login-grid { grid-template-columns: 1fr !important; justify-items: center; }
          .sb-login-copy { display: none !important; }
          .sb-login-footer { flex-direction: column !important; gap: 18px !important; text-align: center; }
          .sb-login-footer-links { gap: 22px !important; }
        }
      `}</style>

      <div className="sb-mesh" />

      <nav style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 5%" }}>
        <Wordmark size={22} />
        <div style={{ display: "flex", alignItems: "center", gap: 34, fontSize: 14 }}>
          <a href="/pricing" style={{ color: t.textMuted, textDecoration: "none" }}>Pricing</a>
          <a href="mailto:supportsitebric@gmail.com" style={{ color: t.textMuted, textDecoration: "none" }}>Contact</a>
        </div>
      </nav>

      <div
        className="sb-login-grid"
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          width: "100%",
          maxWidth: 1320,
          margin: "0 auto",
          padding: "30px 5% 60px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 70,
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div className="sb-login-copy">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: "0.09em",
              color: t.textMuted,
              border: `1px solid ${t.border}`,
              borderRadius: 999,
              padding: "8px 17px",
              marginBottom: 30,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.7)" }} />
            AI-POWERED PLATFORM
          </div>

          <h1 style={{ fontFamily: t.display, fontWeight: 700, fontSize: "clamp(38px, 4.4vw, 58px)", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 26px" }}>
            Build stunning
            <br />
            websites in
            <br />
            <span style={{ color: "rgba(255,255,255,0.42)" }}>seconds.</span>
          </h1>

          <p style={{ fontSize: 15.5, color: t.textMuted, lineHeight: 1.72, maxWidth: 400, margin: "0 0 40px" }}>
            Sitebric is the AI-powered platform that helps you generate, customize, and launch professional
            websites — faster than ever.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginBottom: 46 }}>
            {features.map(([Icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 17, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 12,
                    background: t.bgCard,
                    border: `1px solid ${t.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.text,
                  }}
                >
                  <Icon size={19} />
                </div>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: t.textMuted, lineHeight: 1.55, maxWidth: 250 }}>{desc}</div>
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
                    marginLeft: i === 0 ? 0 : -11,
                    border: "2px solid #0F0F0F",
                    background: `linear-gradient(135deg, rgba(255,255,255,${0.22 - i * 0.03}), rgba(255,255,255,0.06))`,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5, maxWidth: 210 }}>
              Trusted by creators and businesses to build the future of the web.
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
          padding: "26px 5%",
          borderTop: `1px solid ${t.border}`,
          fontSize: 13,
          color: t.textFaint,
        }}
      >
        <span>© {new Date().getFullYear()} Sitebric. All rights reserved.</span>
        <div className="sb-login-footer-links" style={{ display: "flex", gap: 40 }}>
          <a href="/terms" style={{ color: t.textMuted, textDecoration: "none" }}>Terms of Service</a>
          <a href="/privacy" style={{ color: t.textMuted, textDecoration: "none" }}>Privacy Policy</a>
          <a href="mailto:supportsitebric@gmail.com" style={{ color: t.textMuted, textDecoration: "none" }}>Contact Us</a>
        </div>
      </footer>
    </div>
  );
}
