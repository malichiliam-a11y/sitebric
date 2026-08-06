"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import AuthCard from "@/app/components/AuthCard";

export default function Home() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
  const display = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const body = "'Inter', sans-serif";

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

  const faqs = [
    {
      q: "Do I own the sites I generate?",
      a: "Yes — every site you generate belongs to you to hand off or host for your client.",
    },
    {
      q: "Do clients need their own Sitebric account?",
      a: "No — your clients never see Sitebric. You manage everything from your dashboard and hand off the finished site.",
    },
    {
      q: "Can I use my own domain for client sites?",
      a: "Yes — Growth and Pro plans let you connect any domain you or your client owns.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, no contracts — cancel whenever, no questions asked.",
    },
  ];

  return (
    <div style={{ background: "#0A0A10", color: "#F2F0FA", fontFamily: body, position: "relative" }}>
      <style>{`
        @keyframes sbDrift1 {
          0%   { transform: translate(-50%, 0) scale(1); }
          33%  { transform: translate(-38%, 10%) scale(1.22); }
          66%  { transform: translate(-62%, -8%) scale(0.85); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        @keyframes sbDrift2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(14%, 16%) scale(1.3); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes sbDrift3 {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.55; }
          50%  { transform: translate(-16%, -14%) scale(0.75); opacity: 0.9; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
        }
        @keyframes sbDrift4 {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50%  { transform: translate(-12%, 12%) scale(1.25); opacity: 0.7; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        @keyframes sbFadeUp {
          0%   { opacity: 0; transform: translateY(28px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sb-grain::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 100;
          pointer-events: none;
          opacity: 0.055;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .sb-ambient { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .sb-orb { position: absolute; border-radius: 50%; filter: blur(65px); }
        .sb-orb-a {
          top: -15%; left: 50%; width: 1200px; height: 1200px;
          background: radial-gradient(circle, rgba(139,92,246,0.32) 0%, rgba(34,211,238,0.15) 45%, transparent 70%);
          animation: sbDrift1 8s ease-in-out infinite;
        }
        .sb-orb-b {
          top: 30%; left: -10%; width: 680px; height: 680px;
          background: radial-gradient(circle, rgba(34,211,238,0.2) 0%, transparent 70%);
          animation: sbDrift2 9.5s ease-in-out infinite;
        }
        .sb-orb-c {
          top: 60%; left: 80%; width: 580px; height: 580px;
          background: radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%);
          animation: sbDrift3 10.5s ease-in-out infinite;
        }
        .sb-orb-d {
          top: -8%; right: -8%; width: 450px; height: 450px;
          background: radial-gradient(circle, rgba(34,211,238,0.28) 0%, transparent 70%);
          animation: sbDrift4 7s ease-in-out infinite;
        }
        .sb-reveal { animation: sbFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .sb-glow-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .sb-glow-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.3);
        }
        .sb-step:hover .sb-step-num { transform: scale(1.1); }
        .sb-step-num { transition: transform 0.2s; }
        @media (prefers-reduced-motion: reduce) {
          .sb-orb-a, .sb-orb-b, .sb-orb-c, .sb-orb-d, .sb-reveal { animation: none; }
        }
        @media (max-width: 780px) {
          .sb-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="sb-grain" />
      <div className="sb-ambient">
        <div className="sb-orb sb-orb-a" />
        <div className="sb-orb sb-orb-b" />
        <div className="sb-orb sb-orb-c" />
        <div className="sb-orb sb-orb-d" />
      </div>

      {/* ===== NAV ===== */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 6%",
          background: "rgba(10,10,16,0.75)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 18 }}>
          site
          <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            bric
          </span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }} />
            Updated weekly
          </span>
          <a href="/pricing" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
            Pricing
          </a>
          <button
            onClick={() => {
              setShowLogin(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              background: accent,
              color: "#0A0A10",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ===== HERO with embedded login ===== */}
      <div style={{ position: "relative", zIndex: 1, padding: "90px 6% 100px" }}>
        <div
          className="sb-hero-grid"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          {/* Marketing copy */}
          <div>
            <div
              className="sb-reveal"
              style={{
                display: "inline-flex",
                fontSize: 12,
                fontWeight: 600,
                color: "#C4B5FD",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 999,
                padding: "6px 14px",
                marginBottom: 20,
                animationDelay: "0s",
              }}
            >
              Built for website resellers
            </div>
            <h1
              className="sb-reveal"
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.15,
                marginBottom: 20,
                animationDelay: "0.08s",
              }}
            >
              Generate real client websites
              <br />
              with AI, in seconds.
            </h1>
            <p
              className="sb-reveal"
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.7,
                maxWidth: 480,
                marginBottom: 20,
                animationDelay: "0.16s",
              }}
            >
              Tell us about the business — what it does, who it's for, the vibe you're going for — and get a
              polished, ready-to-ship website. No coding, no design work, no waiting.
            </p>
            <div
              className="sb-reveal"
              style={{
                display: "inline-block",
                fontSize: 14,
                lineHeight: 1.6,
                color: "#C4B5FD",
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 10,
                padding: "12px 16px",
                maxWidth: 460,
                animationDelay: "0.24s",
              }}
            >
              You'll charge clients $500–$2,000 a site. Sitebric costs less than a dinner out.
            </div>
          </div>

          {/* Login card / CTA */}
          {!showLogin ? (
            <div
              className="sb-reveal"
              style={{
                width: "100%",
                borderRadius: 20,
                padding: "40px 32px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                animationDelay: "0.3s",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 10,
                }}
              >
                See it in action first
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.6,
                  marginBottom: 26,
                }}
              >
                Scroll around, check out how it works — no account needed until you're ready to build.
              </div>
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  width: "100%",
                  background: accent,
                  color: "#0A0A10",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 10px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
                }}
              >
                Get started free →
              </button>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 12 }}>
                2 free site generations included, no card required
              </div>
            </div>
          ) : (
            <div className="sb-reveal">
              <AuthCard />
            </div>
          )}
        </div>
      </div>

      {/* ===== WHY CHOOSE US ===== */}
      <div style={{ position: "relative", zIndex: 1, padding: "90px 6%", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: "clamp(26px, 3vw, 36px)",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            Why resellers choose site
            <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              bric
            </span>
          </div>
          <div
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.45)",
              fontSize: 15,
              maxWidth: 520,
              margin: "0 auto 50px",
              lineHeight: 1.6,
            }}
          >
            Everything you need to run a real website-reselling business, without the overhead.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {[
              ["✦", "Real sites, not templates", "Every site is generated fresh for that specific business — real copy, real design, not a reused shell."],
              ["⚡", "Minutes, not days", "Describe the client, get a finished site almost instantly. No back-and-forth design cycles."],
              ["◆", "Built for reselling", "Manage every client under one dashboard, generate as many sites as your plan allows."],
              ["✎", "No design skill required", "You don't need to know how to code or design — just describe the business."],
              ["↻", "Shipped weekly, not yearly", "New features and improvements ship every week — your tools keep getting sharper while your competitors wait on their next big release."],
            ].map(([icon, title, desc]) => (
              <div
                key={title}
                className="sb-glow-card"
                style={{
                  borderRadius: 16,
                  padding: 24,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(139,92,246,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    marginBottom: 14,
                  }}
                >
                  <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {icon}
                  </span>
                </div>
                <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div style={{ position: "relative", zIndex: 1, padding: "90px 6%", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: "clamp(26px, 3vw, 36px)",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            How it works
          </div>
          <div
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.45)",
              fontSize: 15,
              maxWidth: 520,
              margin: "0 auto 50px",
              lineHeight: 1.6,
            }}
          >
            Three steps from idea to a site you can hand off.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {[
              ["1", "Tell us about the client", "Business name, what they do, and the vibe you want — a sentence or two is enough."],
              ["2", "AI brings it to life", "A full, polished website gets generated in seconds — real copy, real design."],
              ["3", "Deliver it", "Preview it, publish it, connect their domain, and move on to the next client."],
            ].map(([num, title, desc]) => (
              <div key={title} className="sb-step" style={{ textAlign: "center" }}>
                <div
                  className="sb-step-num"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: accent,
                    color: "#0A0A10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: display,
                    fontWeight: 700,
                    margin: "0 auto 16px",
                  }}
                >
                  {num}
                </div>
                <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== COMPARISON STRIP ===== */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 6% 90px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 16,
              padding: "28px 32px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 600 }}>
              Cheaper than <span style={{ color: "#F2F0FA", fontWeight: 600 }}>Lovable</span> at every comparable
              tier — and built specifically for people reselling sites, not just building them.
            </p>
            <div
              style={{
                fontFamily: display,
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              CANCEL ANYTIME · NO CONTRACTS
            </div>
          </div>
        </div>
      </div>

      {/* ===== FAQ ===== */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 6% 90px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: "clamp(26px, 3vw, 36px)",
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            Questions, answered
          </div>
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "20px 0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600, fontSize: 15 }}>
                {faq.q}
                <span
                  style={{
                    color: "#8B5CF6",
                    fontSize: 18,
                    transition: "transform 0.2s",
                    transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </div>
              <div
                style={{
                  maxHeight: openFaq === i ? 200 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.25s ease",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.6,
                  paddingTop: openFaq === i ? 12 : 0,
                }}
              >
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FINAL CTA ===== */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 6%", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: "clamp(26px, 3vw, 38px)", marginBottom: 16 }}>
          Your next client site is minutes away.
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 30 }}>
          Sign up and generate your first site today.
        </div>
        <button
          onClick={() => {
            setShowLogin(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            background: accent,
            color: "#0A0A10",
            border: "none",
            borderRadius: 12,
            padding: "16px 32px",
            fontFamily: display,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(139,92,246,0.35)",
          }}
        >
          Get started free
        </button>
      </div>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "30px 6%",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
        }}
      >
        © 2026 Sitebric. All rights reserved.
      </footer>
    </div>
  );
}
