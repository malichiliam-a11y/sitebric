"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem("fuseableai_email");
    if (saved) setEmail(saved);

    // If already signed in (e.g. from a previous visit), skip the
    // login form entirely and go straight to the dashboard.
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.push("/dashboard");
    })();
  }, [router]);

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (rememberMe) {
      window.localStorage.setItem("fuseableai_email", email);
    } else {
      window.localStorage.removeItem("fuseableai_email");
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A10",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glowing gradient orb */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(34,211,238,0.12) 45%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <form
        onSubmit={sent ? verifyCode : sendCode}
        style={{
          width: 380,
          borderRadius: 20,
          padding: "40px 36px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 1,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}
        >
          fuseable
          <span
            style={{
              background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ai
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 30,
          }}
        >
          {sent ? "Enter the code we sent you" : "Sign in to your dashboard"}
        </div>

        {!sent && (
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
                fontFamily: "'Inter', sans-serif",
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
                color: "rgba(255,255,255,0.3)",
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              or
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
          </>
        )}

        {sent ? (
          <>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Code sent to {email}
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "13px 16px",
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                letterSpacing: "0.15em",
                marginBottom: 18,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
                color: "#0A0A10",
                border: "none",
                borderRadius: 12,
                padding: "14px 10px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
              }}
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>
          </>
        ) : (
          <>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "13px 16px",
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                marginBottom: 18,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#8B5CF6", width: 14, height: 14 }}
              />
              Remember me on this device
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
                color: "#0A0A10",
                border: "none",
                borderRadius: 12,
                padding: "14px 10px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
              }}
            >
              {loading ? "Sending..." : "Send login code"}
            </button>
          </>
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
      </form>
    </div>
  );
}
