"use client";

import { useState, useRef } from "react";
import { palette, easing } from "@/lib/design";
import { Wordmark, FilmGrain, IconArrowRight } from "@/app/components/login/primitives";
import { Field, PrimaryButton, controlCss } from "@/app/components/login/controls";
import { motion } from "framer-motion";

// Handed off to the dashboard so a visitor who signs up right after
// trying this doesn't have to retype what they just described here —
// read once on mount and cleared, see dashboard-client.js.
const SEED_KEY = "sb_demo_seed";

export default function DemoPage() {
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const resultRef = useRef(null);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!clientName.trim() || !prompt.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/demo-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: clientName.trim(), prompt: prompt.trim() }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        // A killed function returns a platform error page, not JSON — the
        // browser's own JSON-parse error ("The string did not match the
        // expected pattern" in Safari) is meaningless to a visitor.
        throw new Error("That took too long and timed out. Try a shorter or simpler description.");
      }
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || "Something went wrong.");
      }
      setCode(data.code);
      setStatus("done");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function handleSignupClick() {
    try {
      window.localStorage.setItem(SEED_KEY, JSON.stringify({ clientName, prompt }));
    } catch {
      // Storage can be unavailable (Safari private mode, etc.) — signup
      // still works, they just retype the brief instead of it prefilling.
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
          font-family: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        ${controlCss}
        .sb-demo-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 30px 6%;
        }
        .sb-demo-shell {
          max-width: 640px; margin: 0 auto; padding: 40px 6% 120px;
        }
        .sb-demo-result-shell {
          max-width: 1040px; margin: 56px auto 0; padding: 0 6% 120px;
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
        <a className="sb-link" href="/login">
          Log in
        </a>
      </nav>

      <div className="sb-demo-shell" style={{ position: "relative", zIndex: 2 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easing }}>
          <div
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
              marginBottom: 28,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: palette.textMuted }} />
            LIVE DEMO — NO SIGNUP REQUIRED
          </div>
          <h1
            style={{
              fontSize: "clamp(30px, 4.2vw, 44px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              margin: "0 0 18px",
            }}
          >
            Describe a business.
            <br />
            <span style={{ color: palette.textFaint }}>Watch a real site build.</span>
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: palette.textMuted, maxWidth: 480, margin: "0 0 40px" }}>
            Same AI that powers Sitebric — try it on a real business before you sign up for anything.
          </p>
        </motion.div>

        <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Field
            id="demo-client-name"
            label="Business name"
            placeholder="e.g. Riverside Auto Detailing"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            maxLength={100}
            disabled={status === "loading"}
            required
          />
          <div>
            <label
              htmlFor="demo-prompt"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "-0.005em",
                color: palette.text,
                marginBottom: 10,
              }}
            >
              What do they do?
            </label>
            <textarea
              id="demo-prompt"
              className="sb-field"
              placeholder="e.g. Mobile car detailing in Austin, TX — or paste a full brief, as detailed as you want"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              disabled={status === "loading"}
              required
              rows={4}
              style={{ height: "auto", minHeight: 110, padding: "13px 16px", lineHeight: 1.5, resize: "vertical" }}
            />
          </div>
          <PrimaryButton loading={status === "loading"}>
            {status === "loading" ? "Building your site…" : "Generate my site"}
          </PrimaryButton>
          {status === "error" && (
            <div
              style={{
                fontSize: 13.5,
                color: "#F87171",
                background: "rgba(248,113,113,0.07)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              {error}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: palette.textGhost, textAlign: "center" }}>
            Free demos are limited per visitor — sign up for unlimited generations.
          </div>
        </form>
      </div>

      {status === "done" && (
        <div className="sb-demo-result-shell" ref={resultRef} style={{ position: "relative", zIndex: 2 }}>
          <div className="sb-demo-frame-wrap">
            <iframe title={`${clientName} — live demo`} srcDoc={code} sandbox="allow-scripts" />
          </div>
          <div className="sb-demo-cta-bar">
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Like what you see?</div>
              <div style={{ fontSize: 13.5, color: palette.textMuted }}>
                Sign up free to save this, publish it live, and manage it from a real dashboard.
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="sb-oauth"
                style={{ width: "auto", padding: "0 18px" }}
                onClick={() => {
                  setStatus("idle");
                  setCode("");
                }}
              >
                Try another
              </button>
              <a className="sb-demo-signup-btn" href="/login" onClick={handleSignupClick}>
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
