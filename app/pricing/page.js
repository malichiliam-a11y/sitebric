"use client";

import { useState } from "react";
import { t } from "@/lib/theme";
import { PLAN_LIMITS, MULTIPAGE_COST, PLAN_YEARLY_PRICES, yearlySavingCents } from "@/lib/plans";

export default function Pricing() {
  const [hovered, setHovered] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const display = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
  const body = "var(--font-body), sans-serif";

  async function subscribe(planId, interval = "month") {
    setLoadingPlan(`${planId}:${interval}`);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Not signed in. Subscribing needs an account, so remember which
      // plan they picked and send them to create one — checkout resumes
      // by itself once they land in the dashboard. Previously this was a
      // browser alert saying "Please log in first" with nothing to click,
      // which left anyone arriving from the marketing site stuck.
      if (res.status === 401) {
        try {
          window.localStorage.setItem("sb_pending_plan", planId);
          window.localStorage.setItem("sb_pending_interval", interval);
        } catch {
          // Private browsing can block storage — signing in still works,
          // they just pick the plan again afterwards.
        }
        window.location.href = "/login";
        return;
      }

      setCheckoutError(data.message || data.error || "Something went wrong. Try again.");
      setLoadingPlan(null);
    } catch (err) {
      setCheckoutError("Couldn't reach checkout. Check your connection and try again.");
      setLoadingPlan(null);
    }
  }

  // Allowances come from lib/plans.js, which is what the API actually
  // enforces. They used to be typed out here as well, which is how the
  // lead-search allowance ended up missing from the page entirely while
  // every plan had one.
  const allowances = (plan) => [
    `${PLAN_LIMITS[plan].sites} client sites`,
    `${PLAN_LIMITS[plan].generations} AI generations / mo`,
    `${PLAN_LIMITS[plan].searches} lead searches / mo`,
    // Same rule as the rest: read from what the route enforces, never
    // typed out here. A plan with no lines simply doesn't get the line.
    ...(PLAN_LIMITS[plan].numbers
      ? [`AI receptionist — ${PLAN_LIMITS[plan].numbers} phone lines`]
      : []),
  ];

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
        ...allowances("starter"),
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
        ...allowances("growth"),
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
        ...allowances("pro"),
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
                    {loadingPlan === `${tier.id}:month` ? "Redirecting…" : tier.cta}
                  </button>

                  {/* Yearly sits under the monthly button rather than
                      behind a toggle: a toggle hides one of the two
                      prices, and the saving is the argument. */}
                  <button
                    onClick={() => subscribe(tier.id, "year")}
                    disabled={loadingPlan !== null}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 12,
                      padding: "12px 10px",
                      color: "#F2F0FA",
                      fontFamily: display,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: loadingPlan !== null ? "default" : "pointer",
                      lineHeight: 1.35,
                    }}
                  >
                    {loadingPlan === `${tier.id}:year` ? (
                      "Redirecting…"
                    ) : (
                      <>
                        ${(PLAN_YEARLY_PRICES[tier.id] / 100).toFixed(0)}/year
                        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                          {" — "}2 months free
                        </span>
                      </>
                    )}
                  </button>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.35)",
                      textAlign: "center",
                    }}
                  >
                    Save ${(yearlySavingCents(tier.id) / 100).toFixed(0)} a year
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {checkoutError && (
          <div
            style={{
              maxWidth: 1100,
              margin: "24px auto 0",
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "#FCA5A5",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {checkoutError}
          </div>
        )}

        {/* What the two allowances actually mean. Both were listed as bare
            numbers with nothing explaining them, and the lead-search one
            was not listed at all. */}
        <div
          style={{
            maxWidth: 1100,
            margin: "28px auto 0",
            display: "flex",
            flexWrap: "wrap",
            gap: 28,
            fontSize: 13.5,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0, flex: "1 1 300px" }}>
            <span style={{ color: t.text, fontWeight: 600 }}>A generation</span> is one website
            built from your brief. Editing a site afterwards is unlimited and free — a generation
            is only used when a new site is created. A{" "}
            <span style={{ color: t.text, fontWeight: 600 }}>multi-page site</span> (Home,
            Services, About and Contact) uses {MULTIPAGE_COST}.
          </p>
          <p style={{ margin: 0, flex: "1 1 300px" }}>
            <span style={{ color: t.text, fontWeight: 600 }}>A lead search</span> finds local
            businesses in any city and country — name, phone, address, and whether they already
            have a website — so you have someone to sell the sites to. One search returns up to 60
            businesses, and only counts once.
          </p>
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
