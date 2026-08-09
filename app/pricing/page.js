"use client";

import { useState } from "react";
import { t } from "@/lib/theme";

export default function Pricing() {
  const [hovered, setHovered] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const display = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const body = "'Inter', sans-serif";

  async function subscribe(planId) {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Try again.");
        setLoadingPlan(null);
      }
    } catch (err) {
      alert("Something went wrong. Try again.");
      setLoadingPlan(null);
    }
  }

  const tiers = [
    {
      id: "starter",
      name: "Starter",
      tagline: "Land your first few clients",
      price: "15",
      cents: null,
      hook: "Pays for itself before you finish your first sales call.",
      savings: "$10/mo cheaper than Lovable Pro",
      features: [
        "5 client sites",
        "10 AI generations / mo",
        "Publish live sites instantly",
        "Google & email login",
      ],
      cta: "Start building",
      featured: false,
    },
    {
      id: "growth",
      name: "Growth",
      tagline: "Run it like a real business",
      price: "29",
      cents: "99",
      hook: "One client covers two months. Everything after is profit.",
      savings: "$20/mo cheaper than Lovable Business",
      features: [
        "20 client sites",
        "40 AI generations / mo",
        "Custom domain for every client",
        "Everything in Starter",
      ],
      cta: "Scale up",
      featured: true,
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "For agencies closing daily",
      price: "69",
      cents: "99",
      hook: "Under 5% of a single client invoice.",
      savings: "No equivalent tier at Lovable — you'd need Enterprise",
      features: [
        "100 client sites",
        "150 AI generations / mo",
        "White-label — your brand, not ours",
        "Everything in Growth",
      ],
      cta: "Go all in",
      featured: false,
    },
  ];

  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes glowPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes borderSpin {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .sb-featured-ring {
          animation: borderSpin 6s linear infinite;
        }
        .sb-glow {
          animation: glowPulse 3.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-featured-ring, .sb-glow { animation: none; }
        }
      ` }} />

      {/* The page had no links at all, so anyone arriving from the nav was
          stranded here with only the browser back button. */}
      <nav
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 6%",
          fontSize: 14.5,
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: t.text,
            textDecoration: "none",
            fontWeight: 500,
            fontSize: 20,
            letterSpacing: "-0.025em",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M15.5 3H29L17.5 14H4L15.5 3Z" fill="currentColor" />
            <path d="M14.5 18H28L16.5 29H3L14.5 18Z" fill="currentColor" />
          </svg>
          sitebric
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="/#faq" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
            FAQ
          </a>
          <a
            href="mailto:supportsitebric@gmail.com"
            style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
          >
            Contact
          </a>
          <a
            href="/"
            style={{
              color: "#0A0A0A",
              background: "#FFFFFF",
              textDecoration: "none",
              fontWeight: 600,
              borderRadius: 9,
              padding: "9px 17px",
            }}
          >
            Log in
          </a>
        </div>
      </nav>

      {/* ===== HEADER ===== */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "60px 6% 70px",
          textAlign: "center",
        }}
      >
        <div
          className="sb-glow"
          style={{
            position: "absolute",
            top: "-30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 45%, transparent 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 20,
            }}
          >
            Pricing
          </div>
          <h1
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: "clamp(30px, 4vw, 46px)",
              lineHeight: 1.15,
              marginBottom: 18,
            }}
          >
            Every plan pays for itself
            <br />
            with{" "}
            <span style={{ color: "#FFFFFF" }}>one client.</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            You'll charge local businesses $500–$2,000 a site. Sitebric costs
            less than a dinner out. Run that math once and the decision makes
            itself.
          </p>
        </div>
      </div>

      {/* ===== PRICING CARDS ===== */}
      <div style={{ padding: "0 6% 60px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            alignItems: "start",
          }}
        >
          {tiers.map((tier) => {
            const isHovered = hovered === tier.id;
            return (
              <div
                key={tier.id}
                onMouseEnter={() => setHovered(tier.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: "relative",
                  borderRadius: 20,
                  padding: 2,
                  background: tier.featured
                    ? `conic-gradient(from var(--angle, 0deg), rgba(255,255,255,0.9), rgba(255,255,255,0.15), rgba(255,255,255,0.9))`
                    : "transparent",
                  transition: "transform 0.25s ease",
                  transform: isHovered ? "translateY(-8px)" : "translateY(0)",
                }}
                className={tier.featured ? "sb-featured-ring" : ""}
              >
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    borderRadius: 18,
                    padding: "36px 30px",
                    background: tier.featured ? "#0A0A0A" : "rgba(255,255,255,0.03)",
                    border: tier.featured ? "none" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isHovered
                      ? tier.featured
                        ? "0 24px 70px rgba(255,255,255,0.12)"
                        : "0 16px 40px rgba(0,0,0,0.4)"
                      : tier.featured
                      ? "0 20px 60px rgba(255,255,255,0.06)"
                      : "none",
                    transition: "box-shadow 0.25s ease",
                  }}
                >
                  {tier.featured && (
                    <div
                      style={{
                        position: "absolute",
                        top: -13,
                        left: 28,
                        background: "#FFFFFF",
                        color: "#0A0A0A",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "5px 12px",
                        borderRadius: 999,
                      }}
                    >
                      Built for resellers
                    </div>
                  )}

                  <div
                    style={{
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: 6,
                      marginTop: tier.featured ? 8 : 0,
                    }}
                  >
                    {tier.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.45)",
                      marginBottom: 20,
                      minHeight: 18,
                    }}
                  >
                    {tier.tagline}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontFamily: display, fontSize: 42, fontWeight: 700 }}>
                      ${tier.price}
                    </span>
                    {tier.cents && (
                      <span style={{ fontFamily: display, fontSize: 20, fontWeight: 700 }}>
                        .{tier.cents}
                      </span>
                    )}
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                      / month
                    </span>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: t.positive,
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.25)",
                      borderRadius: 999,
                      padding: "5px 12px",
                      marginBottom: 20,
                    }}
                  >
                    {tier.savings}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.65)",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 26,
                    }}
                  >
                    {tier.hook}
                  </div>

                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.08)",
                      marginBottom: 22,
                    }}
                  />

                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 28px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          fontSize: 14,
                          color: "rgba(255,255,255,0.75)",
                          lineHeight: 1.4,
                        }}
                      >
                        <span
                          style={{
                            color: t.positive,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => subscribe(tier.id)}
                    disabled={loadingPlan !== null}
                    style={{
                      width: "100%",
                      background: tier.featured ? "#FFFFFF" : "rgba(255,255,255,0.06)",
                      color: tier.featured ? "#0A0A0A" : t.text,
                      border: tier.featured ? "none" : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      padding: "14px 10px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: loadingPlan !== null ? "default" : "pointer",
                      opacity: loadingPlan !== null && loadingPlan !== tier.id ? 0.5 : 1,
                      transform: isHovered ? "scale(1.02)" : "scale(1)",
                      boxShadow: tier.featured
                        ? isHovered
                          ? "0 12px 32px rgba(255,255,255,0.2)"
                          : "0 8px 24px rgba(255,255,255,0.12)"
                        : "none",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    {loadingPlan === tier.id ? "Redirecting…" : tier.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== COMPARISON STRIP ===== */}
      <div style={{ padding: "0 6% 100px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
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
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
              maxWidth: 600,
            }}
          >
            Cheaper than{" "}
            <span style={{ color: t.text, fontWeight: 600 }}>Lovable</span>{" "}
            at every comparable tier — and built specifically for people
            reselling sites, not just building them.
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
  );
}
