"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { t, type } from "@/lib/theme";

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
        background: t.bg,
        color: t.text,
        fontFamily: t.body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <form onSubmit={handleSubmit} className="sb-reset">
        <style dangerouslySetInnerHTML={{ __html: `
          .sb-reset {
            width: 100%;
            max-width: 440px;
            box-sizing: border-box;
            padding: 44px 44px 38px;
            border-radius: 20px;
            border: 1px solid ${t.borderCard};
            background: ${t.bgCard};
            box-shadow: 0 1px 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.35);
          }
          .sb-reset-field {
            width: 100%; box-sizing: border-box;
            padding: 13px 16px; border-radius: 10px;
            border: 1px solid ${t.borderInput}; background: ${t.bgInput};
            color: ${t.text}; font-family: ${t.body}; font-size: 14.5px; outline: none;
            transition: border-color 160ms ${t.ease}, background 160ms ${t.ease};
          }
          .sb-reset-field::placeholder { color: ${t.textFaint}; }
          
          .sb-reset-field:focus { border-color: ${t.borderFocus}; }
          .sb-reset-cta {
            width: 100%; margin-top: 20px; padding: 14px 10px;
            border: none; border-radius: 10px;
            background: #FFFFFF; color: #0A0A0A;
            font-family: ${t.body}; font-size: 14px; font-weight: 700;
            cursor: pointer;
            transition: transform 160ms ${t.ease}, box-shadow 160ms ${t.ease}, background 160ms ${t.ease};
          }
          .sb-reset-cta:hover:not(:disabled) {
            background: #F2F2F2; transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          }
          .sb-reset-cta:active:not(:disabled) { transform: translateY(0) scale(0.995); box-shadow: none; }
          .sb-reset-cta:disabled { cursor: default; opacity: 0.55; }
          @media (prefers-reduced-motion: reduce) {
            .sb-reset-field, .sb-reset-cta { transition: none; }
            .sb-reset-cta:hover:not(:disabled) { transform: none; }
          }
        ` }} />

        <div style={{ ...type.heading, textAlign: "center", color: t.text, marginBottom: 10 }}>
          Set a new password
        </div>
        <div style={{ ...type.body, textAlign: "center", color: t.textMuted, marginBottom: 32 }}>
          {done ? "Password updated — taking you to your dashboard" : "Choose a new password for your account"}
        </div>

        {!done && (
          <>
            <label htmlFor="sb-new-password" style={{ ...type.label, display: "block", color: t.text, marginBottom: 10 }}>
              New password
            </label>
            <input
              id="sb-new-password"
              className="sb-reset-field"
              type="password"
              required
              autoFocus
              minLength={6}
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="sb-reset-cta" disabled={loading}>
              {loading ? "Updating" : "Update password"}
            </button>
          </>
        )}

        {error && (
          <div style={{ ...type.small, color: t.negative, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
