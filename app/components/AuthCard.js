"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { readReferralCode } from "@/lib/referral";

const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
const display = "'Space Grotesk', sans-serif";
const body = "'Inter', sans-serif";

const inputWrapStyle = { position: "relative", marginBottom: 18 };
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "13px 42px 13px 16px",
  color: "#fff",
  fontFamily: body,
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s",
};
const labelStyle = { display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 500 };
const iconStyle = { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", pointerEvents: "none" };

function focusIn(e) { e.target.style.borderColor = "#8B5CF6"; }
function focusOut(e) { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }

// One card, three modes: signing in, creating an account, and recovering
// a forgotten password — all against Supabase's own email/password auth
// instead of the one-time-code flow this replaced.
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

      // mode === "login"
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back \u{1F44B}";
  const subheading =
    mode === "signup"
      ? "Start building client sites in minutes."
      : mode === "forgot"
      ? "Enter your email and we'll send you a reset link."
      : "Log in to your dashboard to continue.";
  const submitLabel = loading
    ? mode === "signup"
      ? "Creating account…"
      : mode === "forgot"
      ? "Sending…"
      : "Logging in…"
    : mode === "signup"
    ? "Create account"
    : mode === "forgot"
    ? "Send reset link"
    : "Log in";

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        borderRadius: 20,
        padding: "36px 32px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 22, marginBottom: 6, textAlign: "center" }}>
        {heading}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 26, textAlign: "center" }}>
        {subheading}
      </div>

      {mode !== "forgot" && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            style={{
              width: "100%",
              background: "#fff",
              color: "#1a1a1a",
              border: "none",
              borderRadius: 12,
              padding: "12px 10px",
              fontFamily: body,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            or
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>
        </>
      )}

      <label style={labelStyle}>Email</label>
      <div style={inputWrapStyle}>
        <input
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={focusIn}
          onBlur={focusOut}
        />
        <span style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 6-10 7L2 6" />
          </svg>
        </span>
      </div>

      {mode !== "forgot" && (
        <>
          <label style={labelStyle}>Password</label>
          <div style={inputWrapStyle}>
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
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <path d="M1 1l22 22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
          </div>
        </>
      )}

      {mode === "login" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: "#8B5CF6", width: 14, height: 14 }}
            />
            Remember me
          </label>
          <span
            onClick={() => {
              setError("");
              setNotice("");
              setMode("forgot");
            }}
            style={{ fontSize: 13, color: "#22D3EE", cursor: "pointer" }}
          >
            Forgot password?
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          background: accent,
          color: "#0A0A10",
          border: "none",
          borderRadius: 12,
          padding: "14px 10px",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
          boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
          marginTop: mode === "login" ? 18 : 6,
        }}
      >
        {submitLabel}
      </button>

      {notice && (
        <div
          style={{
            fontSize: 12,
            color: "#86EFAC",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            marginTop: 14,
          }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#FCA5A5",
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            marginTop: 14,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 22 }}>
        {mode === "login" && (
          <>
            Don't have an account?{" "}
            <span
              onClick={() => {
                setError("");
                setNotice("");
                setMode("signup");
              }}
              style={{ color: "#F2F0FA", fontWeight: 600, cursor: "pointer" }}
            >
              Sign up
            </span>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account?{" "}
            <span
              onClick={() => {
                setError("");
                setNotice("");
                setMode("login");
              }}
              style={{ color: "#F2F0FA", fontWeight: 600, cursor: "pointer" }}
            >
              Log in
            </span>
          </>
        )}
        {mode === "forgot" && (
          <span
            onClick={() => {
              setError("");
              setNotice("");
              setMode("login");
            }}
            style={{ color: "#F2F0FA", fontWeight: 600, cursor: "pointer" }}
          >
            ← Back to log in
          </span>
        )}
      </div>
    </form>
  );
}
