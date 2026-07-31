"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendMagicLink(e) {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
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
        onSubmit={sendMagicLink}
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
          <div style={{ fontSize: 12, color: "#3A9188" }}>
            Check your email for a login link.
          </div>
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
              send login link
            </button>
            {error && (
              <div style={{ fontSize: 11, color: "#E06C5C", marginTop: 8 }}>
                {error}
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
