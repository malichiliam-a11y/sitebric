"use client";

import { motion } from "framer-motion";
import { palette, metrics, easing } from "@/lib/design";
import { IconBolt, IconPencil, IconRocket, IconStar } from "./primitives";

// Copy carried over from the original landing page — these are the
// reseller hooks, not generic product-feature lines.
const FEATURES = [
  {
    Icon: IconBolt,
    title: "Minutes, not days",
    desc: "Describe the client, get a finished site almost instantly. No back-and-forth design cycles.",
  },
  {
    Icon: IconPencil,
    title: "Real sites, not templates",
    desc: "Every site is generated fresh for that business — real copy, real design, not a reused shell.",
  },
  {
    Icon: IconRocket,
    title: "Built for reselling",
    desc: "Manage every client under one dashboard, and hand off finished sites the same day.",
  },
];

// Children stagger in on load; the reference is static, but a 250ms
// cascade reads as polish rather than motion for its own sake.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easing } },
};

export default function HeroCopy() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="sb-copy">
      <motion.div
        variants={item}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: "0.1em",
          color: palette.textMuted,
          border: `1px solid ${palette.hairline}`,
          borderRadius: 999,
          padding: "8px 16px",
          marginBottom: 36,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: palette.textMuted }} />
        BUILT FOR WEBSITE RESELLERS
      </motion.div>

      <motion.h1
        variants={item}
        style={{
          fontSize: "clamp(36px, 3.7vw, 56px)",
          fontWeight: 600,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          margin: "0 0 28px",
          color: palette.text,
        }}
      >
        Generate real client
        <br />
        websites with AI,
        <br />
        <span style={{ color: palette.textFaint }}>in seconds.</span>
      </motion.h1>

      <motion.p
        variants={item}
        style={{
          fontSize: 15.5,
          lineHeight: 1.65,
          letterSpacing: "-0.005em",
          color: palette.textMuted,
          maxWidth: 392,
          margin: "0 0 44px",
        }}
      >
        Tell us about the business — what it does, who it&apos;s for, the vibe you&apos;re going for — and get a
        polished, ready-to-ship website.
      </motion.p>

      <div style={{ display: "flex", flexDirection: "column", gap: metrics.featureGap, marginBottom: 48 }}>
        {FEATURES.map(({ Icon, title, desc }) => (
          <motion.div key={title} variants={item} className="sb-feature" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <span className="sb-tile">
              <Icon size={19} />
            </span>
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 14.5, fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 5, color: palette.text }}>
                {title}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: palette.textMuted, maxWidth: 236 }}>
                {desc}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={item}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          borderRadius: 14,
          padding: "20px 24px",
          border: `1px solid ${palette.hairline}`,
          background: palette.card,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        {/* The placeholder avatars and star rating implied review data
            that does not exist. Replaced with the pricing hook, which is
            a claim about our own price rather than about customers. */}
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 10,
            border: `1px solid ${palette.hairline}`,
            background: palette.tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: palette.text,
          }}
        >
          <IconStar size={14} />
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: palette.textMuted, maxWidth: 292 }}>
          You&apos;ll charge clients <span style={{ color: palette.text }}>$500–$2,000</span> a site.
          Sitebric costs less than a dinner out.
        </div>
      </motion.div>
    </motion.div>
  );
}
