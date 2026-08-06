"use client";

import { motion } from "framer-motion";
import { palette, metrics, easing } from "@/lib/design";
import { IconBolt, IconPencil, IconRocket, IconStar } from "./primitives";

const FEATURES = [
  { Icon: IconBolt, title: "AI-Powered", desc: "Generate complete websites with a simple prompt." },
  { Icon: IconPencil, title: "Fully Customizable", desc: "Edit and personalize every detail to match your brand." },
  { Icon: IconRocket, title: "Launch Instantly", desc: "Publish your website in one click and go live." },
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
        AI-POWERED PLATFORM
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
        Build stunning
        <br />
        websites in
        <br />
        <span style={{ color: palette.textFaint }}>seconds.</span>
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
        Sitebric is the AI-powered platform that helps you generate, customize, and launch professional
        websites — faster than ever.
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
        <div style={{ display: "flex" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                marginLeft: i === 0 ? 0 : -12,
                border: "2px solid #0A0A0A",
                background: `linear-gradient(140deg, rgba(255,255,255,${0.22 - i * 0.035}), rgba(255,255,255,0.05))`,
              }}
            />
          ))}
        </div>
        <div>
          <div style={{ display: "flex", gap: 3, color: palette.textMuted, marginBottom: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <IconStar key={i} size={12} />
            ))}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: palette.textMuted, maxWidth: 228 }}>
            Trusted by creators and businesses to build the future of the web.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
