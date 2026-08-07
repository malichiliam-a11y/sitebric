"use client";

import { motion } from "framer-motion";
import { palette, metrics, easing } from "@/lib/design";
import { Wordmark, IconX, IconDiscord, IconGitHub } from "./primitives";

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
