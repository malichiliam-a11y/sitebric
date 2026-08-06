"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message || "Couldn't create your account. Try again.");
        } else {
          router.push("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message || "That email or password didn't work.");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const mono = "'Space Grotesk', sans-serif";
  const body = "'Inter', sans-serif";

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "13px 44px 13px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{ background: "#0B0B0D", color: "#fff", minHeight: "100vh", fontFamily: body }}>
      <style>{`
        @keyframes gridDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 0 120px; }
        }
        .sb-mono-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 30% 70%, black 0%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 60% at 30% 70%, black 0%, transparent 75%);
          animation: gridDrift 8s linear infinite;
        }
        .sb-mono-input:focus { border-color: rgba(255,255,255,0.4) !important; }
        .sb-mono-input::placeholder { color: rgba(255,255,255,0.35); }
        @media (max-width: 900px) {
          .sb-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ===== NAV ===== */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 6%",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 18 }}>sitebric</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <a href="/pricing" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14 }}>
            Pricing
          </a>
          <a href="mailto:supportsitebric@gmail.com" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14 }}>
            Contact
          </a>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <div style={{ position: "relative", padding: "80px 6%", overflow: "hidden" }}>
        <div className="sb-mono-grid" />
        <div
          className="sb-hero-grid"
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 0.85fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          {/* Left: marketing copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 999,
                padding: "6px 14px",
                marginBottom: 24,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
              AI-POWERED PLATFORM
            </div>

            <h1
              style={{
                fontFamily: mono,
                fontWeight: 700,
                fontSize: "clamp(36px, 4.5vw, 52px)",
                lineHeight: 1.1,
                marginBottom: 20,
              }}
            >
              Build stunning websites
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>in seconds.</span>
            </h1>

            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 460, marginBottom: 36 }}>
              Sitebric is the AI-powered platform that helps you generate, customize, and launch professional client websites — faster than ever.
            </p>

            {[
              ["⚡", "AI-Powered", "Generate complete websites with a simple prompt."],
              ["✎", "Fully Customizable", "Edit and personalize every detail to match your brand."],
              ["🚀", "Launch Instantly", "Publish your website in one click and go live."],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 28,
                padding: "16px 20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                maxWidth: 460,
              }}
            >
              <div style={{ display: "flex" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#333",
                      border: "2px solid #0B0B0D",
                      marginLeft: i > 1 ? -10 : 0,
                    }}
                  />
                ))}
              </div>
              <div>
                <div style={{ color: "#FBBF24", fontSize: 12, marginBottom: 2 }}>★★★★★</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  Trusted by resellers to build the future of the web.
                </div>
              </div>
            </div>
          </div>

          {/* Right: login card */}
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              borderRadius: 20,
              padding: "40px 36px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24, marginBottom: 12 }}>sitebric</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                {mode === "signup" ? "Create your account 🚀" : "Welcome back 👋"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                {mode === "signup" ? "Start building client sites today" : "Log in to your account to continue"}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Email</label>
              <div style={{ position: "relative" }}>
                <input
                  className="sb-mono-input"
                  style={inputStyle}
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}>
                  ✉
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="sb-mono-input"
                  style={inputStyle}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.4, cursor: "pointer" }}
                >
                  {showPassword ? "🙈" : "👁"}
                </span>
              </div>
            </div>

            {mode === "login" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: "#fff" }} />
                  Remember me
                </label>
                <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
                  Forgot password?
                </a>
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
                  marginBottom: 16,
                }}
              >
                {typeof error === "string" ? error : "Something went wrong. Please try again."}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#fff",
                color: "#0B0B0D",
                border: "none",
                borderRadius: 10,
                padding: "14px 10px",
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                marginBottom: 20,
              }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Sign up →" : "Log in →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "13px 10px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>G</span>
              Continue with Google
            </button>

            <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <span onClick={() => setMode("login")} style={{ color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                    Log in
                  </span>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <span onClick={() => setMode("signup")} style={{ color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                    Sign up
                  </span>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
