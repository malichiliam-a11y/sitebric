"use client";

import { motion } from "framer-motion";
import { palette, metrics, easing } from "@/lib/design";
import { Wordmark, IconX, IconDiscord, IconGitHub } from "./primitives";

// The styles TopNav and BottomBar need in order to look right. They live
// here, with the components, because any page that renders the chrome needs
// them — the /for/<audience> landing pages rendered with blue underlined
// links and a nav stacked on top of the wordmark until this existed.
//
// LoginScreen predates this and still carries its own equivalent copies in
// its style block; it is deliberately left alone (that page has broken
// three times on style changes). Anything new should inject this instead.
export const chromeCss = `
  .sb-link { color: ${palette.textMuted}; cursor: pointer; text-decoration: none;
             transition: color 160ms cubic-bezier(0.22,1,0.36,1); }
  .sb-link:hover { color: ${palette.text}; }

  .sb-footer { border-top: 1px solid ${palette.hairline}; }

  @media (prefers-reduced-motion: reduce) {
    .sb-link { transition: none; }
  }
  @media (max-width: 1040px) {
    .sb-footer { flex-direction: column !important; gap: 20px !important; text-align: center; }
    .sb-footer-links { gap: 26px !important; flex-wrap: wrap; justify-content: center; }
  }
  @media (max-width: 720px) {
    .sb-nav { padding: 22px 6% !important; }
    /* The text links collapse rather than wrap onto the wordmark. The CTA
       is exempt — on a landing page it's the whole point of the nav. */
    .sb-nav a:not(.sb-nav-cta) { display: none; }
  }
`;

export function TopNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easing }}
      className="sb-nav"
      style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `30px ${metrics.gutterRight} 30px ${metrics.gutterLeft}`,
      }}
    >
      <Wordmark size={23} />
      {/* Every item here goes somewhere. The theme toggle that used to sit
          on the end was removed rather than left inert — the app is
          dark-only, so it was a control that could never do anything. */}
      <div style={{ display: "flex", alignItems: "center", gap: 34, fontSize: 14.5 }}>
        <a className="sb-link" href="#how-it-works">How it works</a>
        <a className="sb-link" href="#faq">FAQ</a>
        <a className="sb-link" href="/pricing">Pricing</a>
        <a className="sb-link" href="mailto:supportsitebric@gmail.com">Contact</a>
        <a
          href="/demo"
          className="sb-nav-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 999,
            border: `1px solid ${palette.hairlineStrong}`,
            color: palette.text,
            fontSize: 13.5,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80" }} />
          Try it live
        </a>
      </div>
    </motion.nav>
  );
}

export function BottomBar() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.25, ease: easing }}
      className="sb-footer"
      style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        padding: `28px ${metrics.gutterRight} 28px ${metrics.gutterLeft}`,
        fontSize: 13.5,
        color: palette.textGhost,
      }}
    >
      <span>© {new Date().getFullYear()} Sitebric. All rights reserved.</span>
      <div className="sb-footer-links" style={{ display: "flex", gap: 44 }}>
        <a className="sb-link" href="/terms">Terms of Service</a>
        <a className="sb-link" href="/privacy">Privacy Policy</a>
        <a className="sb-link" href="mailto:supportsitebric@gmail.com">Contact Us</a>
      </div>
      <div style={{ display: "flex", gap: 20, color: palette.textGhost }}>
        <IconX size={16} />
        <IconDiscord size={17} />
        <IconGitHub size={17} />
      </div>
    </motion.footer>
  );
}
