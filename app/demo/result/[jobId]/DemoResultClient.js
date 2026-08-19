"use client";

import { useState } from "react";
import { palette, easing } from "@/lib/design";
import { Wordmark, FilmGrain, IconArrowRight } from "@/app/components/login/primitives";
import { controlCss } from "@/app/components/login/controls";
import { useDemoJob } from "@/app/components/login/useDemoJob";
import DemoPending from "@/app/components/login/DemoPending";
import { motion } from "framer-motion";

// Landed on by bookmarking or revisiting the link /api/demo-generate hands
// back — the generation itself runs server-side via waitUntil regardless
// of whether this page (or the one that started it) is even open, so this
// is just the UI catching up to whatever the job's real status is.
const SEED_KEY = "sb_demo_seed";

export default function DemoResultClient({ jobId }) {
  const job = useDemoJob(jobId);
  const jobUrl = jobId && typeof window !== "undefined" ? window.location.href : "";
  const [copied, setCopied] = useState(false);

  function handleWantAccount() {
    // Only the business name survives a cold landing here — the original
    // brief text lives in whichever tab actually submitted the form.
    if (!job.clientName) return;
    try {
      window.localStorage.setItem(SEED_KEY, JSON.stringify({ clientName: job.clientName, prompt: "" }));
    } catch {
      // Storage can be unavailable — signup still works either way.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked without a secure context or permission; the
      // URL is in the address bar either way, so this stays silent.
    }
  }

  return (
    <div className="sb-demo">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sb-demo {
          position: relative;
          min-height: 100vh;
          background: ${palette.bg};
          color: ${palette.text};
          font-family: var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
          h1, h2, h3 {
            font-family: var(--font-display), Georgia, serif;
            font-weight: 600;
            letter-spacing: -0.012em;
          }
        ${controlCss}
        .sb-demo-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 30px 6%;
        }
        .sb-demo-result-shell {
          max-width: 1040px; margin: 40px auto 0; padding: 0 6% 120px;
        }
        .sb-demo-pending-shell {
          max-width: 480px; margin: 80px auto 0; padding: 0 6%;
        }
        .sb-demo-frame-wrap {
          position: relative;
          width: 100%;
          height: 70vh;
          min-height: 420px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid ${palette.hairline};
          background: #0A0A0A;
        }
        .sb-demo-frame-wrap iframe {
          position: absolute; inset: 0; width: 100%; height: 100%; border: none;
        }
        .sb-demo-cta-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px; flex-wrap: wrap;
          margin-top: 20px;
          padding: 20px 24px;
          border-radius: 14px;
          border: 1px solid ${palette.hairline};
          background: ${palette.card};
        }
        .sb-demo-signup-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: #FFFFFF; color: #0A0A0A;
          border: none; border-radius: 10px;
          padding: 13px 22px; font-size: 14.5px; font-weight: 600;
          text-decoration: none; white-space: nowrap; cursor: pointer;
        }
        @media (max-width: 640px) {
          .sb-demo-frame-wrap { height: 56vh; }
          .sb-demo-cta-bar { flex-direction: column; align-items: stretch; text-align: center; }
        }
      `,
        }}
      />
      <FilmGrain opacity={0.035} />

      <nav className="sb-demo-nav" style={{ position: "relative", zIndex: 2 }}>
        <a href="/" style={{ display: "flex", textDecoration: "none" }}>
          <Wordmark size={22} />
        </a>
        <a className="sb-link" href="/demo">
          Try another
        </a>
      </nav>

      {job.status === "pending" && (
        <div className="sb-demo-pending-shell" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easing }}>
            <div style={{ fontSize: 15, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>
              {job.clientName ? `Still building ${job.clientName}…` : "Still building…"}
            </div>
            <DemoPending elapsed={job.elapsed} jobUrl={jobUrl} />
          </motion.div>
        </div>
      )}

      {job.status === "error" && (
        <div className="sb-demo-pending-shell" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <div
            style={{
              fontSize: 13.5,
              color: "#F87171",
              background: "rgba(248,113,113,0.07)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            {job.error || "This generation failed."}
          </div>
          <a className="sb-link sb-link--strong" href="/demo">
            Try again →
          </a>
        </div>
      )}

      {!job.status && (
        <div className="sb-demo-pending-shell" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: palette.textMuted }}>Loading…</div>
        </div>
      )}

      {job.status === "done" && (
        <div className="sb-demo-result-shell" style={{ position: "relative", zIndex: 2 }}>
          <div className="sb-demo-frame-wrap">
            <iframe title={`${job.clientName || "Live demo"} result`} srcDoc={job.code} sandbox="allow-scripts" />
          </div>
          <div className="sb-demo-cta-bar">
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Like what you see?</div>
              <div style={{ fontSize: 13.5, color: palette.textMuted }}>
                Sign up free to save this, publish it live, and manage it from a real dashboard.
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* The link already works when pasted; this just removes the
                  step of selecting the address bar to get at it. */}
              <button
                type="button"
                className="sb-oauth"
                style={{ width: "auto", padding: "0 18px" }}
                onClick={copyLink}
              >
                {copied ? "Link copied" : "Copy link"}
              </button>
              <a className="sb-oauth" style={{ width: "auto", padding: "0 18px", textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/demo">
                Try another
              </a>
              <a className="sb-demo-signup-btn" href="/login" onClick={handleWantAccount}>
                Create free account
                <IconArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
