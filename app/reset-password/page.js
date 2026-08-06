"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
const display = "'Space Grotesk', sans-serif";
const body = "'Inter', sans-serif";
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "13px 16px",
  color: "#fff",
  fontFamily: body,
  fontSize: 14,
  marginBottom: 18,
  outline: "none",
};

// Landing target for the link in Supabase's password-reset email. Clicking
// that link gives the browser a recovery session automatically (the
// Supabase client picks the tokens up from the URL on load) — this page
// just has to let them set a new password while that session is active.
export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A10",
        color: "#F2F0FA",
        fontFamily: body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
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
          Set a new password
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 26, textAlign: "center" }}>
          {done ? "Password updated — taking you to your dashboard…" : "Choose a new password for your account."}
        </div>

        {!done && (
          <>
            <input
              type="password"
              required
              autoFocus
              minLength={6}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
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
              }}
            >
              {loading ? "Updating…" : "Update password"}
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
