"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { readReferralCode } from "@/lib/referral";
import { t, type } from "@/lib/theme";

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

  function switchMode(next) {
    setError("");
    setNotice("");
    setMode(next);
  }

  async function signInWithGoogle() {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message || "Google sign-in isn't available right now. Try email instead.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (rememberMe) window.localStorage.setItem("sitebric_email", email);
      else window.localStorage.removeItem("sitebric_email");

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
        if (error) setError(error.message);
        else if (data.session) router.push("/dashboard");
        else setNotice("Almost there — check your email to confirm your account.");
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

  const heading = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back 👋";
  const subheading =
    mode === "signup"
      ? "Start building client sites in minutes"
      : mode === "forgot"
      ? "We'll email you a link to set a new one"
      : "Log in to your account to continue";
  const cta = loading
    ? mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending…" : "Logging in…"
    : mode === "signup" ? "Create account →" : mode === "forgot" ? "Send reset link →" : "Log in →";

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        boxSizing: "border-box",
        borderRadius: 20,
        padding: "40px 36px",
        background: t.bgCard,
        border: `1px solid ${t.borderCard}`,
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .sb-mono-input {
          width: 100%;
          box-sizing: border-box;
          background: ${t.bgInput};
          border: 1px solid ${t.borderInput};
          border-radius: 10px;
          padding: 13px 44px 13px 16px;
          color: #fff;
          font-family: ${t.body};
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .sb-mono-input:focus { border-color: ${t.borderFocus}; }
        .sb-mono-input::placeholder { color: ${t.textGhost}; }

        .sb-mono-affix {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          display: flex; opacity: 0.4;
        }
        .sb-mono-affix--btn { cursor: pointer; transition: opacity 0.2s; }
        .sb-mono-affix--btn:hover { opacity: 0.7; }

        .sb-mono-cta {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #fff; color: ${t.bg};
          border: none; border-radius: 10px;
          padding: 14px 10px;
          font-family: ${t.body}; font-weight: 700; font-size: 14px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .sb-mono-cta:hover:not(:disabled) { background: #F0F0F0; transform: translateY(-1px); }
        .sb-mono-cta:active:not(:disabled) { transform: translateY(0); }
        .sb-mono-cta:disabled { cursor: default; opacity: 0.6; }

        .sb-mono-oauth {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: ${t.bgInput}; color: #fff;
          border: 1px solid ${t.borderStrong}; border-radius: 10px;
          padding: 13px 10px;
          font-family: ${t.body}; font-weight: 600; font-size: 14px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .sb-mono-oauth:hover { background: ${t.bgHover}; border-color: rgba(255,255,255,0.25); }

        .sb-mono-link {
          color: ${t.textMuted}; text-decoration: none; cursor: pointer;
          transition: color 0.2s;
        }
        .sb-mono-link:hover { color: #fff; }

        @media (prefers-reduced-motion: reduce) {
          .sb-mono-cta, .sb-mono-oauth, .sb-mono-input, .sb-mono-link { transition: none; }
          .sb-mono-cta:hover:not(:disabled) { transform: none; }
        }
      ` }} />

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ ...type.title, marginBottom: 12 }}>sitebric</div>
        <div style={{ ...type.heading, marginBottom: 6 }}>{heading}</div>
        <div style={{ ...type.small, color: t.textFaint }}>{subheading}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="sb-email" style={{ ...type.label, display: "block", marginBottom: 8 }}>Email</label>
        <div style={{ position: "relative" }}>
          <input
            id="sb-email"
            className="sb-mono-input"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <span className="sb-mono-affix">✉</span>
        </div>
      </div>

      {mode !== "forgot" && (
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sb-password" style={{ ...type.label, display: "block", marginBottom: 8 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="sb-password"
              className="sb-mono-input"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="sb-mono-affix sb-mono-affix--btn"
              onClick={() => setShowPassword((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPassword((v) => !v);
                }
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              👁
            </span>
          </div>
        </div>
      )}

      {mode === "login" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, ...type.small, color: t.textMuted, cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ accentColor: "#fff" }}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <span className="sb-mono-link" style={{ ...type.small }} onClick={() => switchMode("forgot")}>
            Forgot password?
          </span>
        </div>
      )}

      <button type="submit" className="sb-mono-cta" disabled={loading} style={{ marginBottom: 20 }}>
        {cta}
      </button>

      {notice && (
        <div style={{ ...type.small, color: t.positive, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 20 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ ...type.small, color: t.negative, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {mode !== "forgot" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ ...type.micro, fontWeight: 400, color: t.textGhost }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          <button type="button" className="sb-mono-oauth" onClick={signInWithGoogle}>
            {/* Google's real mark rather than a plain "G" — Sign in with
                Google branding requires the logo, and a text G renders
                inconsistently across platforms. */}
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 22, ...type.small, color: t.textFaint }}>
        {mode === "login" && (
          <>
            Don&apos;t have an account?{" "}
            <span className="sb-mono-link" style={{ color: "#fff", fontWeight: 600 }} onClick={() => switchMode("signup")}>
              Sign up
            </span>
          </>
        )}
        {mode === "signup" && (
          <>
            Already have an account?{" "}
            <span className="sb-mono-link" style={{ color: "#fff", fontWeight: 600 }} onClick={() => switchMode("login")}>
              Log in
            </span>
          </>
        )}
        {mode === "forgot" && (
          <span className="sb-mono-link" style={{ color: "#fff", fontWeight: 600 }} onClick={() => switchMode("login")}>
            Back to log in
          </span>
        )}
      </div>
    </form>
  );
}
