"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { palette, metrics, easing } from "@/lib/design";
import { IconArrowRight } from "./primitives";
import { Field, PrimaryButton, controlCss } from "./controls";

// Handed off to the dashboard so a visitor who signs up right after
// trying this doesn't have to retype what they just described here —
// read once on mount and cleared, see dashboard-client.js. Same key the
// standalone /demo page uses, so either entry point works interchangeably.
const SEED_KEY = "sb_demo_seed";

// This is the hero's default tab: the live "type a business, watch a
// real site build" generator, so a first-time visitor sees the actual
// product working before they've signed up for anything. Sits in the
// exact card slot AuthCard normally occupies — HeroPanel swaps between
// the two rather than nesting one inside the other.
export default function DemoPanel({ onWantAccount }: { onWantAccount: () => void }) {
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
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
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || "Something went wrong.");
      }
      setCode(data.code);
      setStatus("done");
    } catch (err) {
      setError((err as Error)?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function handleWantAccount() {
    try {
      window.localStorage.setItem(SEED_KEY, JSON.stringify({ clientName, prompt }));
    } catch {
      // Storage can be unavailable (Safari private mode, etc.) — signup
      // still works, they just retype the brief instead of it prefilling.
    }
    onWantAccount();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easing }}
      style={{
        width: "100%",
        maxWidth: metrics.cardWidth,
        boxSizing: "border-box",
        padding: `${metrics.cardPadTop}px ${metrics.cardPadX}px ${metrics.cardPadBottom}px`,
        borderRadius: metrics.cardRadius,
        border: `1px solid ${palette.hairline}`,
        background: `linear-gradient(180deg, ${palette.cardTop} 0%, ${palette.card} 46%, ${palette.card} 100%)`,
        boxShadow: "0 1px 1px rgba(0,0,0,0.55), 0 24px 70px rgba(0,0,0,0.5)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: controlCss }} />

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.09em",
          color: palette.textMuted,
          border: `1px solid ${palette.hairline}`,
          borderRadius: 999,
          padding: "6px 13px",
          marginBottom: 22,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80" }} />
        LIVE DEMO — NO SIGNUP NEEDED
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 600,
          letterSpacing: "-0.015em",
          color: palette.text,
          marginBottom: 10,
        }}
      >
        Watch a real site build
      </div>
      <div style={{ fontSize: 14.5, color: palette.textMuted, marginBottom: 32 }}>
        Describe any business — same AI that powers Sitebric.
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {status !== "done" ? (
          <motion.form
            key="form"
            onSubmit={handleGenerate}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: easing }}
            style={{ display: "flex", flexDirection: "column", gap: 26 }}
          >
            <Field
              id="hero-demo-name"
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
                htmlFor="hero-demo-prompt"
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
                id="hero-demo-prompt"
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
                  color: palette.negative,
                  background: "rgba(248,113,113,0.07)",
                  border: "1px solid rgba(248,113,113,0.18)",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                {error}
              </div>
            )}
          </motion.form>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: easing }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 340,
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${palette.hairline}`,
                background: "#0A0A0A",
                marginBottom: 20,
              }}
            >
              <iframe
                title={`${clientName} — live demo`}
                srcDoc={code}
                sandbox="allow-scripts"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="sb-oauth"
                style={{ flex: "1 1 auto" }}
                onClick={() => {
                  setStatus("idle");
                  setCode("");
                }}
              >
                Try another
              </button>
              <button
                type="button"
                className="sb-cta"
                style={{ flex: "1 1 auto", position: "relative" }}
                onClick={handleWantAccount}
              >
                <span>Create free account</span>
                <span className="sb-cta-arrow">
                  <IconArrowRight size={17} />
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status !== "done" && (
        <div style={{ textAlign: "center", marginTop: 28, fontSize: 13.5, color: palette.textMuted }}>
          Already have an account?{" "}
          <span className="sb-link sb-link--strong" onClick={onWantAccount}>
            Log in
          </span>
        </div>
      )}
    </motion.div>
  );
}
