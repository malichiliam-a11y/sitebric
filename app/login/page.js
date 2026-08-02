"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* faint grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />

      <form
        onSubmit={sent ? verifyCode : sendCode}
        style={{
          width: 360,
          border: "1px solid #fff",
          padding: "36px 32px",
          background: "#000",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 4,
            letterSpacing: "-0.02em",
          }}
        >
          site<span style={{ opacity: 0.4 }}>forge</span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#666",
            marginBottom: 28,
            letterSpacing: "0.05em",
          }}
        >
          {sent ? "// verify identity" : "// authenticate to continue"}
        </div>

        {sent ? (
          <>
            <label
              style={{
                display: "block",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#999",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              6-digit code sent to {email}
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#000",
                border: "1px solid #333",
                borderRadius: 0,
                padding: "12px 14px",
                color: "#fff",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                letterSpacing: "0.3em",
                marginBottom: 16,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#fff")}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 0,
                padding: "13px 10px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {loading ? "verifying..." : "verify →"}
            </button>
          </>
        ) : (
          <>
            <label
              style={{
                display: "block",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#999",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              email
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
                background: "#000",
                border: "1px solid #333",
                borderRadius: 0,
                padding: "12px 14px",
                color: "#fff",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                marginBottom: 16,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#fff")}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 0,
                padding: "13px 10px",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {loading ? "sending..." : "send code →"}
            </button>
          </>
        )}
        {error && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#fff",
              background: "#1a1a1a",
              border: "1px solid #333",
              padding: "8px 10px",
              marginTop: 14,
            }}
          >
            ! {error}
          </div>
        )}
      </form>
    </div>
  );
}
