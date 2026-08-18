"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { palette, easing } from "@/lib/design";
import { FAQS } from "@/lib/faqs";
import { AUDIENCES } from "@/lib/audiences";

/**
 * The marketing page that lives below the login hero.
 *
 * The copy is carried over verbatim from the original multi-section
 * landing page — these are the reseller hooks that were already written
 * and tested, restyled into the monochrome system rather than rewritten.
 */

const STEPS = [
  ["01", "Tell us about the client", "Business name, what they do, and the vibe you want — a sentence or two is enough."],
  ["02", "AI brings it to life", "A full, polished website gets generated in seconds — real copy, real design."],
  ["03", "Deliver it", "Preview it, publish it, connect their domain, and move on to the next client."],
] as const;

const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easing } },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 500,
        letterSpacing: "0.1em",
        color: palette.textGhost,
        marginBottom: 18,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "clamp(28px, 3vw, 40px)",
        fontWeight: 600,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        margin: "0 0 16px",
        textAlign: "center",
        color: palette.text,
      }}
    >
      {children}
    </h2>
  );
}

export default function Sections() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="sb-sections">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sb-sections { position: relative; z-index: 2; background: ${palette.bg}; }
        .sb-section { padding: 104px 8.8% 104px 6.2%; border-top: 1px solid ${palette.hairline}; }
        .sb-section-inner { max-width: 1040px; margin: 0 auto; }

        .sb-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
          gap: 26px;
          margin-top: 62px;
        }
        .sb-step {
          padding: 34px 30px 32px;
          border-radius: 16px;
          border: 1px solid ${palette.hairline};
          background: ${palette.card};
          transition: border-color 240ms cubic-bezier(0.22,1,0.36,1),
                      transform 240ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-step:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-3px); }
        .sb-step-num {
          font-size: 12px; font-weight: 600; letter-spacing: 0.14em;
          color: ${palette.textGhost}; margin-bottom: 22px;
        }

        .sb-faq { max-width: 720px; margin: 54px auto 0; }
        .sb-faq-row { border-bottom: 1px solid ${palette.hairline}; }
        .sb-faq-q {
          width: 100%; box-sizing: border-box;
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
          padding: 24px 2px; background: none; border: none; cursor: pointer;
          font-family: inherit; font-size: 15.5px; font-weight: 500; letter-spacing: -0.01em;
          color: ${palette.text}; text-align: left;
          transition: color 180ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-faq-q:hover { color: #FFFFFF; }
        .sb-faq-sign {
          flex-shrink: 0; width: 15px; height: 15px; position: relative;
          color: ${palette.textFaint};
          transition: transform 260ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-faq-sign::before, .sb-faq-sign::after {
          content: ""; position: absolute; background: currentColor;
        }
        .sb-faq-sign::before { left: 0; top: 7px; width: 15px; height: 1.4px; }
        .sb-faq-sign::after  { top: 0; left: 7px; height: 15px; width: 1.4px;
                               transition: opacity 200ms ease; }
        .sb-faq-row[data-open="true"] .sb-faq-sign { transform: rotate(90deg); }
        .sb-faq-row[data-open="true"] .sb-faq-sign::after { opacity: 0; }

        .sb-faq-a {
          overflow: hidden;
          font-size: 14.5px; line-height: 1.65; color: ${palette.textMuted};
          max-width: 620px;
          transition: max-height 300ms cubic-bezier(0.22,1,0.36,1),
                      opacity 220ms ease, padding-bottom 300ms cubic-bezier(0.22,1,0.36,1);
        }

        /* Self-selection, offered rather than imposed: this sits partway
           down the page, so nobody has to answer a question before they can
           see the product. Scrolling straight past it costs them nothing. */
        .sb-pick {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
          gap: 20px;
          margin-top: 54px;
        }
        .sb-pick-card {
          display: block;
          padding: 28px 26px;
          border-radius: 16px;
          border: 1px solid ${palette.hairline};
          background: ${palette.card};
          text-decoration: none;
          transition: border-color 240ms cubic-bezier(0.22,1,0.36,1),
                      transform 240ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-pick-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-3px); }
        .sb-pick-label {
          font-size: 16px; font-weight: 500; letter-spacing: -0.015em;
          color: ${palette.text}; margin-bottom: 9px;
        }
        .sb-pick-blurb { font-size: 13.5px; line-height: 1.6; color: ${palette.textMuted}; }
        .sb-pick-go {
          margin-top: 16px; font-size: 13px; font-weight: 500;
          color: ${palette.textFaint};
        }
        .sb-pick-card:hover .sb-pick-go { color: ${palette.text}; }

        .sb-cta-band { text-align: center; }
        .sb-cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          height: 54px; padding: 0 30px; margin-top: 34px;
          border: none; border-radius: 10px;
          background: #FFFFFF; color: #0A0A0A;
          font-family: inherit; font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
          cursor: pointer;
          transition: transform 200ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-cta-btn:hover { transform: translateY(-2px); }

        @media (prefers-reduced-motion: reduce) {
          .sb-step, .sb-cta-btn, .sb-faq-sign, .sb-pick-card { transition: none; }
        }
        @media (max-width: 720px) {
          .sb-section { padding: 76px 6% 76px; }
          .sb-steps { margin-top: 44px; }
        }
      `,
        }}
      />

      {/* ---------------------------------------------- how it works */}
      <section className="sb-section" id="how-it-works">
        <motion.div
          className="sb-section-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <Heading>Three steps from idea to a site you can hand off.</Heading>

          <div className="sb-steps">
            {STEPS.map(([num, title, desc]) => (
              <div key={title} className="sb-step">
                <div className="sb-step-num">{num}</div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    marginBottom: 10,
                    color: palette.text,
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: palette.textMuted }}>{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------ which are you */}
      <section className="sb-section" id="which-one">
        <motion.div
          className="sb-section-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          <Eyebrow>WHICH ONE ARE YOU?</Eyebrow>
          <Heading>The pitch changes depending on who&apos;s asking.</Heading>

          <div className="sb-pick">
            {AUDIENCES.map((a) => (
              <a key={a.slug} className="sb-pick-card" href={`/for/${a.slug}`}>
                <div className="sb-pick-label">{a.chooserLabel}</div>
                <div className="sb-pick-blurb">{a.chooserBlurb}</div>
                <div className="sb-pick-go">See how →</div>
              </a>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------- faq */}
      <section className="sb-section" id="faq">
        <motion.div
          className="sb-section-inner"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          <Eyebrow>FAQ</Eyebrow>
          <Heading>Questions, answered.</Heading>

          <div className="sb-faq">
            {FAQS.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div key={faq.q} className="sb-faq-row" data-open={isOpen}>
                  <button
                    type="button"
                    className="sb-faq-q"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {faq.q}
                    <span className="sb-faq-sign" aria-hidden="true" />
                  </button>
                  <div
                    className="sb-faq-a"
                    style={{
                      maxHeight: isOpen ? 200 : 0,
                      opacity: isOpen ? 1 : 0,
                      paddingBottom: isOpen ? 24 : 0,
                    }}
                  >
                    {faq.a}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* -------------------------------------------------- final cta */}
      <section className="sb-section">
        <motion.div
          className="sb-section-inner sb-cta-band"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Heading>Your next client site is minutes away.</Heading>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: palette.textMuted }}>
            Sign up and generate your first site today.
          </div>
          <button
            type="button"
            className="sb-cta-btn"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              // Focus the email field once the hero is back in view, so the
              // button lands the user in the form rather than just near it.
              window.setTimeout(() => document.getElementById("sb-email")?.focus(), 620);
            }}
          >
            Get started free
          </button>
        </motion.div>
      </section>
    </div>
  );
}
