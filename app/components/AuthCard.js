"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { readReferralCode } from "@/lib/referral";
import { t, type, cardBg, CONTROL_H } from "@/lib/theme";
import { IconMail, IconEye, IconEyeOff, IconArrowRight } from "./Icons";

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

  const heading = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back \u{1F44B}";
  const subheading =
    mode === "signup"
      ? "Start building client sites in minutes"
      : mode === "forgot"
      ? "We'll email you a link to set a new one"
      : "Log in to your account to continue";
  const submitLabel = loading
    ? mode === "signup" ? "Creating account" : mode === "forgot" ? "Sending" : "Logging in"
    : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in";

  return (
    <form onSubmit={handleSubmit} className="sb-card">
      <style dangerouslySetInnerHTML={{ __html: `
        .sb-card {
          width: 100%;
          max-width: 596px;
          box-sizing: border-box;
          padding: 52px 52px 44px;
          border-radius: 20px;
          border: 1px solid ${t.border};
          background: ${cardBg};
          box-shadow: 0 1px 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.35);
        }
        .sb-card * { font-family: ${t.body}; }

        .sb-field {
          width: 100%;
          height: ${CONTROL_H}px;
          box-sizing: border-box;
          padding: 0 46px 0 16px;
          border-radius: 10px;
          border: 1px solid ${t.border};
          background: ${t.bgInput};
          color: ${t.text};
          font-size: 14.5px;
          outline: none;
          transition: border-color 160ms ${t.ease}, background 160ms ${t.ease};
        }
        .sb-field::placeholder { color: ${t.textFaint}; }
        .sb-field:hover { border-color: ${t.borderHover}; }
        .sb-field:focus { border-color: ${t.borderStrong}; background: #0D0D0D; }

        .sb-affix {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          display: flex; color: ${t.textFaint}; pointer-events: none;
          transition: color 160ms ${t.ease};
        }
        .sb-affix--action { pointer-events: auto; cursor: pointer; }
        .sb-affix--action:hover { color: ${t.textMuted}; }

        /* Primary action. The lift is 1px and the press is 0.5% — enough
           to feel responsive, small enough that it stays below conscious notice. */
        .sb-cta {
          position: relative;
          width: 100%;
          height: ${CONTROL_H}px;
          display: flex; align-items: center; justify-content: center;
          border: none; border-radius: 10px;
          background: #FFFFFF; color: #0A0A0A;
          font-size: 15px; font-weight: 600; letter-spacing: -0.01em;
          cursor: pointer;
          transition: transform 160ms ${t.ease}, box-shadow 160ms ${t.ease}, background 160ms ${t.ease};
        }
        .sb-cta:hover:not(:disabled) {
          background: #F2F2F2;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        .sb-cta:active:not(:disabled) { transform: translateY(0) scale(0.995); box-shadow: none; }
        .sb-cta:disabled { cursor: default; opacity: 0.55; }
        .sb-cta-arrow {
          position: absolute; right: 18px; display: flex;
          transition: transform 200ms ${t.ease};
        }
        .sb-cta:hover:not(:disabled) .sb-cta-arrow { transform: translateX(3px); }

        .sb-oauth {
          width: 100%;
          height: ${CONTROL_H}px;
          display: flex; align-items: center; justify-content: center; gap: 11px;
          border-radius: 10px; border: 1px solid ${t.border};
          background: ${t.bgInput}; color: ${t.text};
          font-size: 15px; font-weight: 500; cursor: pointer;
          transition: border-color 160ms ${t.ease}, background 160ms ${t.ease};
        }
        .sb-oauth:hover { border-color: ${t.borderHover}; background: #0E0E0E; }

        .sb-link { color: ${t.textMuted}; cursor: pointer; transition: color 160ms ${t.ease}; }
        .sb-link:hover { color: ${t.text}; }
        .sb-link--strong { color: ${t.text}; font-weight: 500; }
        .sb-link--strong:hover { color: #FFFFFF; }

        /* Native checkbox restyled rather than replaced, so it stays
           keyboard- and screen-reader-addressable. */
        .sb-check {
          appearance: none; -webkit-appearance: none;
          width: 17px; height: 17px; margin: 0; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.2); border-radius: 5px;
          background: ${t.bgInput}; cursor: pointer; position: relative;
          transition: background 140ms ${t.ease}, border-color 140ms ${t.ease};
        }
        .sb-check:hover { border-color: ${t.borderStrong}; }
        .sb-check:checked { background: #FFFFFF; border-color: #FFFFFF; }
        .sb-check:checked::after {
          content: ""; position: absolute; left: 5.5px; top: 2px;
          width: 4px; height: 8px;
          border: solid #0A0A0A; border-width: 0 1.8px 1.8px 0;
          transform: rotate(45deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-cta, .sb-cta-arrow, .sb-field, .sb-oauth, .sb-link, .sb-check { transition: none; }
          .sb-cta:hover:not(:disabled) { transform: none; }
        }

        @media (max-width: 560px) {
          .sb-card { padding: 34px 22px 30px; border-radius: 16px; }
          .sb-card-title { font-size: 32px !important; margin-bottom: 26px !important; }
          .sb-remember { font-size: 13px !important; }
        }
      ` }} />

      <div className="sb-card-title" style={{ ...type.title, textAlign: "center", color: t.text, marginBottom: 38 }}>
        sitebric
      </div>

      <div style={{ ...type.heading, textAlign: "center", color: t.text, marginBottom: 10 }}>
        {heading}
      </div>
      <div style={{ ...type.body, textAlign: "center", color: t.textMuted, marginBottom: 44 }}>
        {subheading}
      </div>

      <label htmlFor="sb-email" style={{ ...type.label, display: "block", color: t.text, marginBottom: 10 }}>
        Email
      </label>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
          id="sb-email"
          className="sb-field"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <span className="sb-affix"><IconMail size={17} /></span>
      </div>

      {mode !== "forgot" && (
        <>
          <label htmlFor="sb-password" style={{ ...type.label, display: "block", color: t.text, marginBottom: 10 }}>
            Password
          </label>
          <div style={{ position: "relative", marginBottom: 24 }}>
            <input
              id="sb-password"
              className="sb-field"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="sb-affix sb-affix--action"
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
              {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
            </span>
          </div>
        </>
      )}

      {mode === "login" && (
        <div className="sb-remember" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, ...type.small }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: t.textMuted, cursor: "pointer", whiteSpace: "nowrap" }}>
            <input className="sb-check" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>
          <span className="sb-link" onClick={() => switchMode("forgot")} style={{ whiteSpace: "nowrap" }}>
            Forgot password?
          </span>
        </div>
      )}

      <button type="submit" className="sb-cta" disabled={loading}>
        {submitLabel}
        {!loading && <span className="sb-cta-arrow"><IconArrowRight size={17} /></span>}
      </button>

      {notice && (
        <div style={{ ...type.small, color: t.positive, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ ...type.small, color: t.negative, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
          {error}
        </div>
      )}

      {mode !== "forgot" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "28px 0", color: t.textFaint, ...type.small }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            or
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          <button type="button" className="sb-oauth" onClick={signInWithGoogle}>
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

      <div style={{ textAlign: "center", color: t.textMuted, marginTop: 32, ...type.small }}>
        {mode === "login" && (
          <>Don&apos;t have an account? <span className="sb-link sb-link--strong" onClick={() => switchMode("signup")}>Sign up</span></>
        )}
        {mode === "signup" && (
          <>Already have an account? <span className="sb-link sb-link--strong" onClick={() => switchMode("login")}>Log in</span></>
        )}
        {mode === "forgot" && (
          <span className="sb-link sb-link--strong" onClick={() => switchMode("login")}>Back to log in</span>
        )}
      </div>
    </form>
  );
}
