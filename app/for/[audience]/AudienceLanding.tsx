"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { captureReferralCode } from "@/lib/referral";
import { captureUtmParams, captureDefaultUtm } from "@/lib/utm";
import { palette, metrics, easing } from "@/lib/design";
import type { Audience, IconName } from "@/lib/audiences";
import TerrainBackdrop from "@/app/components/login/TerrainBackdrop";
import { FilmGrain, IconBolt, IconPencil, IconRocket, IconStar } from "@/app/components/login/primitives";
import { TopNav, BottomBar, chromeCss } from "@/app/components/login/Chrome";

// Named in the copy data so lib/audiences.ts stays server-safe.
const ICONS: Record<IconName, (p: { size?: number }) => JSX.Element> = {
  bolt: IconBolt,
  pencil: IconPencil,
  rocket: IconRocket,
  star: IconStar,
};

// Product-level and identical for every audience — what differs between
// these pages is the reason to care, not the mechanics.
const STEPS = [
  ["01", "Describe the business", "Its name, what it does, and the feel you want — a sentence or two is plenty."],
  ["02", "Get a finished site", "A complete, polished website in seconds. Real copy, real design, built for that business."],
  ["03", "Hand it over", "Preview it, publish it, connect a domain, and invoice for it. Then do the next one."],
] as const;

const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easing } },
};

export default function AudienceLanding({ audience }: { audience: Audience }) {
  useEffect(() => {
    // Same capture contract as the login screen: an ad or a referral link
    // can point straight here, so ?ref= and ?utm_* must survive a landing
    // that isn't "/". Both no-op when the param is absent.
    captureReferralCode();
    captureUtmParams();
    // Only lands if the URL carried no campaign of its own, so organic
    // traffic to this page is still attributable to it.
    captureDefaultUtm({ source: "landing", medium: "organic", campaign: audience.slug });
  }, [audience.slug]);

  return (
    <div className="sb-land">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        ${chromeCss}

        .sb-land {
          position: relative;
          background: ${palette.bg};
          color: ${palette.text};
          font-family: var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          scroll-behavior: smooth;
        }
          h1, h2, h3 {
            font-family: var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
        .sb-land [id] { scroll-margin-top: 24px; }

        /* The hero clips its own backdrop so the terrain doesn't stretch
           down behind the sections — same containment as the login hero. */
        .sb-land-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
        }
        .sb-land-hero-inner {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-sizing: border-box;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 6% 72px;
          text-align: center;
        }

        .sb-land-pill {
          display: inline-flex; align-items: center; gap: 10px;
          align-self: center;
          font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em;
          color: ${palette.textMuted};
          border: 1px solid ${palette.hairline};
          border-radius: 999px;
          padding: 8px 16px;
          margin-bottom: 32px;
        }

        .sb-land-h1 {
          font-size: clamp(38px, 5.4vw, 64px);
          font-weight: 600;
          letter-spacing: -0.035em;
          line-height: 1.04;
          margin: 0 0 26px;
          color: ${palette.text};
        }
        .sb-land-h1 .tail { color: ${palette.textFaint}; }

        .sb-land-sub {
          font-size: 16.5px; line-height: 1.65; letter-spacing: -0.005em;
          color: ${palette.textMuted};
          max-width: 620px; margin: 0 auto 40px;
        }

        .sb-land-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 18px; flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .sb-land-cta {
          display: inline-flex; align-items: center; gap: 10px;
          /* border-box matters at the mobile width, where this goes
             width:100% — content-box would add the 60px of padding on
             top of it and push the page into a sideways scroll. */
          box-sizing: border-box;
          height: ${metrics.controlHeight}px; padding: 0 30px;
          border-radius: ${metrics.controlRadius}px;
          background: #FFFFFF; color: #0A0A0A;
          font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
          text-decoration: none;
          transition: transform 200ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-land-cta:hover { transform: translateY(-2px); }
        .sb-land-cta-alt {
          font-size: 14.5px; color: ${palette.textMuted}; text-decoration: none;
          transition: color 180ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-land-cta-alt:hover { color: ${palette.text}; }

        .sb-land-note { font-size: 13px; color: ${palette.textGhost}; }

        .sb-land-section {
          position: relative; z-index: 2;
          background: ${palette.bg};
          border-top: 1px solid ${palette.hairline};
          padding: 104px 6%;
        }
        .sb-land-inner { max-width: 1040px; margin: 0 auto; }

        .sb-land-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
          gap: 26px;
        }
        .sb-land-card {
          padding: 32px 28px;
          border-radius: 16px;
          border: 1px solid ${palette.hairline};
          background: ${palette.card};
          text-align: left;
          transition: border-color 240ms cubic-bezier(0.22,1,0.36,1),
                      transform 240ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-land-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-3px); }
        .sb-land-tile {
          width: ${metrics.featureTile}px; height: ${metrics.featureTile}px;
          border-radius: ${metrics.featureTileRadius}px;
          border: 1px solid ${palette.hairline};
          background: ${palette.tile};
          display: flex; align-items: center; justify-content: center;
          color: ${palette.text};
          margin-bottom: 22px;
        }
        .sb-land-step-num {
          font-size: 12px; font-weight: 600; letter-spacing: 0.14em;
          color: ${palette.textGhost}; margin-bottom: 22px;
        }
        .sb-land-card-title {
          font-size: 16px; font-weight: 500; letter-spacing: -0.015em;
          margin-bottom: 9px; color: ${palette.text};
        }
        .sb-land-card-desc { font-size: 13.5px; line-height: 1.6; color: ${palette.textMuted}; }

        .sb-land-eyebrow {
          font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em;
          color: ${palette.textGhost}; margin-bottom: 18px; text-align: center;
        }
        .sb-land-h2 {
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 600; letter-spacing: -0.03em; line-height: 1.1;
          margin: 0 0 54px; text-align: center; color: ${palette.text};
        }

        .sb-land-money {
          display: flex; align-items: center; gap: 20px;
          max-width: 560px; margin: 0 auto;
          border: 1px solid ${palette.hairline};
          background: ${palette.card};
          border-radius: 14px;
          padding: 20px 24px;
          text-align: left;
        }
        .sb-land-money-mark {
          width: 36px; height: 36px; flex-shrink: 0;
          border-radius: 10px;
          border: 1px solid ${palette.hairline};
          background: ${palette.tile};
          display: flex; align-items: center; justify-content: center;
          color: ${palette.text};
        }
        .sb-land-money-text { font-size: 13.5px; line-height: 1.55; color: ${palette.textMuted}; }

        .sb-land-faq { max-width: 720px; margin: 0 auto; }
        .sb-land-faq-row { border-bottom: 1px solid ${palette.hairline}; padding: 22px 2px; }
        .sb-land-faq-q {
          font-size: 15.5px; font-weight: 500; letter-spacing: -0.01em;
          color: ${palette.text}; margin-bottom: 10px;
        }
        .sb-land-faq-a {
          font-size: 14.5px; line-height: 1.65; color: ${palette.textMuted}; max-width: 620px;
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-land-card, .sb-land-cta, .sb-land-cta-alt { transition: none; }
        }
        @media (max-width: 720px) {
          .sb-land-section { padding: 76px 6%; }
          .sb-land-hero-inner { padding: 24px 6% 60px; }
          .sb-land-actions { flex-direction: column; gap: 16px; }
          .sb-land-cta { width: 100%; justify-content: center; }
        }
      `,
        }}
      />

      <FilmGrain opacity={0.035} />

      <section className="sb-land-hero">
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <TerrainBackdrop />
        </div>

        <TopNav />

        <div className="sb-land-hero-inner">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: easing }}>
            <div className="sb-land-pill">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: palette.textMuted }} />
              {audience.eyebrow}
            </div>

            <h1 className="sb-land-h1">
              {audience.headlineHead} <span className="tail">{audience.headlineTail}</span>
            </h1>

            <p className="sb-land-sub">{audience.subhead}</p>

            <div className="sb-land-actions">
              <a className="sb-land-cta" href="/demo">
                Generate a site free
              </a>
              <a className="sb-land-cta-alt" href="/login">
                or create an account →
              </a>
            </div>

            <div className="sb-land-note">No card required. Your first site takes about a minute.</div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------ why this audience */}
      <section className="sb-land-section">
        <motion.div
          className="sb-land-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="sb-land-grid">
            {audience.features.map(({ icon, title, desc }) => {
              const Icon = ICONS[icon];
              return (
                <div key={title} className="sb-land-card">
                  <span className="sb-land-tile">
                    <Icon size={19} />
                  </span>
                  <div className="sb-land-card-title">{title}</div>
                  <div className="sb-land-card-desc">{desc}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 54 }}>
            <div className="sb-land-money">
              <span className="sb-land-money-mark">
                <IconStar size={14} />
              </span>
              <div className="sb-land-money-text">{audience.moneyLine}</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* -------------------------------------------------- how it works */}
      <section className="sb-land-section" id="how-it-works">
        <motion.div
          className="sb-land-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="sb-land-eyebrow">HOW IT WORKS</div>
          <h2 className="sb-land-h2">Three steps from idea to a site you can hand off.</h2>

          <div className="sb-land-grid">
            {STEPS.map(([num, title, desc]) => (
              <div key={title} className="sb-land-card">
                <div className="sb-land-step-num">{num}</div>
                <div className="sb-land-card-title">{title}</div>
                <div className="sb-land-card-desc">{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* --------------------------------------------------------- faq */}
      <section className="sb-land-section" id="faq">
        <motion.div
          className="sb-land-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="sb-land-eyebrow">FAQ</div>
          <h2 className="sb-land-h2">Questions, answered.</h2>

          {/* Rendered open rather than as an accordion: search engines and
              a skimming visitor both get the answers without interaction. */}
          <div className="sb-land-faq">
            {audience.faqs.map((faq) => (
              <div key={faq.q} className="sb-land-faq-row">
                <div className="sb-land-faq-q">{faq.q}</div>
                <div className="sb-land-faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* --------------------------------------------------- closing cta */}
      <section className="sb-land-section">
        <motion.div
          className="sb-land-inner"
          style={{ textAlign: "center" }}
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="sb-land-h2" style={{ marginBottom: 16 }}>
            Try it on a real business.
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: palette.textMuted, margin: "0 0 34px" }}>
            Describe one you know and watch what comes back. No account needed.
          </p>
          <a className="sb-land-cta" href="/demo">
            Generate a site free
          </a>
        </motion.div>
      </section>

      <BottomBar />
    </div>
  );
}
