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
      options: {
        shouldCreateUser: true,
      },
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
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F0EEE6",
      }}
    >
      <form
        onSubmit={sent ? verifyCode : sendCode}
        style={{
          width: 320,
          border: "1px solid #232427",
          borderRadius: 8,
          padding: 24,
          background: "#131316",
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 16 }}>
          site<span style={{ color: "#6C63FF" }}>forge</span>
        </div>

        {sent ? (
          <>
            <div style={{ fontSize: 12, color: "#3A9188", marginBottom: 10 }}>
              Check your email for a 6-digit code.
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#0D0E10",
                border: "1px solid #232427",
                borderRadius: 6,
                padding: "8px 10px",
                color: "#F0EEE6",
                fontSize: 14,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#6C63FF",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {loading ? "checking..." : "verify code"}
            </button>
          </>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#0D0E10",
                border: "1px solid #232427",
                borderRadius: 6,
                padding: "8px 10px",
                color: "#F0EEE6",
                fontSize: 12,
                marginBottom: 10,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#6C63FF",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {loading ? "sending..." : "send login code"}
            </button>
          </>
        )}
        {error && (
          <div style={{ fontSize: 11, color: "#E06C5C", marginTop: 8 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
