"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { readReferralCode } from "@/lib/referral";
import { t, cardBg } from "@/lib/theme";
import { IconMail, IconEye, IconEyeOff, IconArrowRight } from "./Icons";

const labelStyle = { display: "block", fontSize: 14, color: t.text, marginBottom: 11, fontWeight: 500 };
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: t.bgInput,
  border: `1px solid ${t.border}`,
  borderRadius: 11,
  padding: "17px 48px 17px 18px",
  color: t.text,
  fontFamily: t.body,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
};
const iconStyle = {
  position: "absolute",
  right: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: t.textFaint,
  display: "flex",
  pointerEvents: "none",
};

function focusIn(e) { e.target.style.borderColor = t.borderStrong; }
function focusOut(e) { e.target.style.borderColor = t.border; }

// One card, three modes: signing in, creating an account, and recovering
// a forgotten password — all against Supabase email/password auth.
export default function AuthCard({ initialMode = "login" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState(() => (typeof window !== "undefined" && window.localStorage.getItem("sitebric_email")) || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function signInWithGoogle() {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message || "Google sign-in isn't available right now. Try email instead.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (rememberMe) {
        window.localStorage.setItem("sitebric_email", email);
      } else {
        window.localStorage.removeItem("sitebric_email");
      }

      const supabase = createClient();

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(error.message);
        else setNotice("Check your email for a link to reset your password.");
        return;
      }

      if (mode === "signup") {
        const ref = readReferralCode();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: ref ? { ref } : undefined,
          },
        });
        if (error) {
          setError(error.message);
        } else if (data.session) {
          router.push("/dashboard");
        } else {
          setNotice("Almost there — check your email to confirm your account.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back \u{1F44B}";
  const subheading =
    mode === "signup"
      ? "Start building client sites in minutes."
      : mode === "forgot"
      ? "Enter your email and we'll send you a reset link."
      : "Log in to your account to continue";
  const submitLabel = loading
    ? mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending…" : "Logging in…"
    : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in";

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: 588,
        borderRadius: 18,
        padding: "52px 52px 44px",
        background: cardBg,
        border: `1px solid ${t.border}`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontFamily: t.display,
          fontWeight: 500,
          fontSize: 38,
          letterSpacing: "-0.03em",
          textAlign: "center",
          color: t.text,
          marginBottom: 26,
        }}
      >
        sitebric
      </div>

      <div style={{ fontFamily: t.display, fontWeight: 700, fontSize: 22, marginBottom: 10, textAlign: "center", color: t.text }}>
        {heading}
      </div>
      <div style={{ fontSize: 14.5, color: t.textMuted, marginBottom: 38, textAlign: "center" }}>
        {subheading}
      </div>

      <label style={labelStyle}>Email</label>
      <div style={{ position: "relative", marginBottom: 26 }}>
        <input
          type="email"
          required
          autoFocus
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={focusIn}
          onBlur={focusOut}
        />
        <span style={iconStyle}><IconMail size={17} /></span>
      </div>

      {mode !== "forgot" && (
        <>
          <label style={labelStyle}>Password</label>
          <div style={{ position: "relative", marginBottom: 26 }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={focusIn}
              onBlur={focusOut}
            />
            <span
              style={{ ...iconStyle, cursor: "pointer", pointerEvents: "auto" }}
              onClick={() => setShowPassword((v) => !v)}
              role="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
            </span>
          </div>
        </>
      )}

      {mode === "login" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: t.textMuted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: "#FFFFFF", width: 15, height: 15 }}
            />
            Remember me
          </label>
          <span
            onClick={() => { setError(""); setNotice(""); setMode("forgot"); }}
            style={{ fontSize: 13.5, color: t.textMuted, cursor: "pointer" }}
          >
            Forgot password?
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          position: "relative",
          width: "100%",
          background: "#FFFFFF",
          color: "#000000",
          border: "none",
          borderRadius: 11,
          padding: "18px 10px",
          fontFamily: t.body,
          fontWeight: 600,
          fontSize: 15,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: mode === "login" ? 0 : 4,
        }}
      >
        {submitLabel}
        {!loading && (
          <span style={{ position: "absolute", right: 18, display: "flex" }}>
            <IconArrowRight size={17} />
          </span>
        )}
      </button>

      {notice && (
        <div style={{ fontSize: 12.5, color: t.positive, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "11px 14px", marginTop: 16 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12.5, color: t.negative, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "11px 14px", marginTop: 16 }}>
          {error}
        </div>
      )}

      {mode !== "forgot" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "26px 0", color: t.textFaint, fontSize: 13.5 }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            or
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            style={{
              width: "100%",
              background: t.bgInput,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: 11,
              padding: "17px 10px",
              fontFamily: t.body,
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 11,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}

      <div style={{ textAlign: "center", fontSize: 14, color: t.textMuted, marginTop: 30 }}>
        {mode === "login" && (
          <>
            Don't have an account?{" "}
            <span
              onClick={() => { setError(""); setNotice(""); setMode("signup"); }}
              style={{ color: t.text, fontWeight: 600, cursor: "pointer" }}
            >
              Sign up
            </span>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account?{" "}
            <span
              onClick={() => { setError(""); setNotice(""); setMode("login"); }}
              style={{ color: t.text, fontWeight: 600, cursor: "pointer" }}
            >
              Log in
            </span>
          </>
        )}
        {mode === "forgot" && (
          <span
            onClick={() => { setError(""); setNotice(""); setMode("login"); }}
            style={{ color: t.text, fontWeight: 600, cursor: "pointer" }}
          >
            ← Back to log in
          </span>
        )}
      </div>
    </form>
  );
}
