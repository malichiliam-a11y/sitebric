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

  useEffect(() => {
    const saved = window.localStorage.getItem("siteforge_email");
    if (saved) setEmail(saved);
  }, []);

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    window.localStorage.setItem("siteforge_email", email);
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
          site
          <span
            style={{
              background: "linear-gradient(90deg, #8B5CF6, #22D3EE)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            forge
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
