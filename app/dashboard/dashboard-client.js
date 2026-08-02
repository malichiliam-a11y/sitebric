"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function DashboardClient({ initialProjects }) {
  const supabase = createClient();
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("preview");
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const active = projects.find((p) => p.id === activeId);
  const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
  const display = "'Space Grotesk', sans-serif";
  const body = "'Inter', sans-serif";

  useEffect(() => {
    const hasGenerating = projects.some((p) => p.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
    }, 2000);
    return () => clearInterval(interval);
  }, [projects, supabase]);

  async function generate() {
    if (!clientName.trim() || !prompt.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, prompt }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setActiveId(result.id);
      setClientName("");
      setPrompt("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProject(id) {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ height: "100vh", display: "flex", color: "#F2F0FA", background: "#0A0A10", fontFamily: body }}>
      <div
        style={{
          width: 300,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          background: "rgba(255,255,255,0.015)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: display, fontWeight: 700, fontSize: 17 }}>
            fuseable
            <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ai
            </span>
          </span>
          <button onClick={signOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <button
            onClick={() => setActiveId(null)}
            style={{
              width: "100%",
              background: accent,
              color: "#0A0A10",
              border: "none",
              borderRadius: 12,
              padding: "12px 10px",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(139,92,246,0.3)",
            }}
          >
            + New client site
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          {projects.length === 0 && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 12 }}>No client sites yet.</div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                cursor: "pointer",
                padding: "12px 14px",
                borderRadius: 12,
                marginBottom: 8,
                fontSize: 13,
                border: p.id === activeId ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                background: p.id === activeId ? "rgba(139,92,246,0.08)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 500 }}>{p.client_name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(p.id);
                  }}
                  style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}
                >
                  ✕
                </span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {p.status === "generating" && <span style={{ color: "#22D3EE" }}>● generating</span>}
                {p.status === "done" && <span style={{ color: "#4ADE80" }}>● live</span>}
                {p.status === "error" && <span style={{ color: "#F87171" }}>● failed</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {!active && (
          <>
            {/* glowing gradient background, like a hero */}
            <div
              style={{
                position: "absolute",
                top: "-30%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 1100,
                height: 1100,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(34,211,238,0.12) 45%, transparent 70%)",
                filter: "blur(50px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 32,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                What client are we building for?
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 36, textAlign: "center" }}>
                Describe the business, generate a full site in seconds.
              </div>

              <div
                style={{
                  width: "100%",
                  maxWidth: 620,
                  borderRadius: 20,
                  padding: 22,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
              >
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client / business name — e.g. Rosa's Bakery"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "13px 16px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    marginBottom: 12,
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the business & what the site needs — vibe, sections, key info..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "13px 16px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    resize: "none",
                    outline: "none",
                    marginBottom: 14,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
                <button
                  onClick={generate}
                  disabled={busy || !clientName.trim() || !prompt.trim()}
                  style={{
                    width: "100%",
                    background: busy ? "rgba(255,255,255,0.08)" : accent,
                    color: busy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 10px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: busy ? "default" : "pointer",
                    boxShadow: busy ? "none" : "0 6px 20px rgba(139,92,246,0.3)",
                  }}
                >
                  {busy ? "Generating…" : "Generate site →"}
                </button>
                {error && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#FCA5A5",
                      background: "rgba(220,38,38,0.1)",
                      border: "1px solid rgba(220,38,38,0.25)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginTop: 12,
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {active && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 14, fontFamily: display, fontWeight: 600 }}>{active.client_name}</span>
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
                <button
                  onClick={() => setView("preview")}
                  style={{
                    background: view === "preview" ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Preview
                </button>
                <button
                  onClick={() => setView("code")}
                  style={{
                    background: view === "code" ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Code
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: "#0A0A10", minHeight: 0 }}>
              {active.status === "generating" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  Generating…
                </div>
              )}
              {active.status === "done" && view === "preview" && (
                <iframe
                  title="preview"
                  srcDoc={active.code}
                  sandbox="allow-scripts allow-modals allow-forms"
                  style={{ width: "100%", height: "100%", border: "none", background: "white" }}
                />
              )}
              {active.status === "done" && view === "code" && (
                <pre style={{ height: "100%", overflow: "auto", padding: 20, fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                  {active.code}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
