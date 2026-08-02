"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function DashboardClient({ initialProjects }) {
  const supabase = createClient();
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("preview");
  const [showNew, setShowNew] = useState(false);
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const active = projects.find((p) => p.id === activeId);

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
      setShowNew(false);
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

  const mono = "'JetBrains Mono', monospace";
  const display = "'Space Grotesk', sans-serif";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        color: "#fff",
        background: "#000",
        fontFamily: mono,
      }}
    >
      <div
        style={{
          width: 290,
          borderRight: "1px solid #fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: display, fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            site<span style={{ opacity: 0.4 }}>forge</span>
          </span>
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            sign out
          </button>
        </div>

        <div style={{ padding: 14 }}>
          <button
            onClick={() => setShowNew(true)}
            style={{
              width: "100%",
              background: "#fff",
              color: "#000",
              border: "none",
              borderRadius: 0,
              padding: "11px 10px",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + new client site
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
          {projects.length === 0 && (
            <div style={{ fontSize: 11, color: "#555", padding: 10, letterSpacing: "0.02em" }}>
              no client sites yet.
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                cursor: "pointer",
                padding: "10px 12px",
                borderRadius: 0,
                marginBottom: 6,
                fontSize: 12,
                border: p.id === activeId ? "1px solid #fff" : "1px solid #262626",
                background: p.id === activeId ? "#111" : "transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#fff" }}>{p.client_name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(p.id);
                  }}
                  style={{ color: "#555", fontSize: 10 }}
                >
                  ✕
                </span>
              </div>
              <div style={{ fontSize: 10, marginTop: 4, letterSpacing: "0.05em" }}>
                {p.status === "generating" && <span style={{ color: "#999" }}>◐ generating</span>}
                {p.status === "done" && <span style={{ color: "#fff" }}>● live</span>}
                {p.status === "error" && <span style={{ color: "#666" }}>● failed</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {showNew && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 440,
                border: "1px solid #fff",
                borderRadius: 0,
                padding: 24,
                background: "#000",
              }}
            >
              <button
                onClick={() => setShowNew(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: 11,
                  cursor: "pointer",
                  marginBottom: 18,
                  letterSpacing: "0.03em",
                }}
              >
                ← back
              </button>
              <div style={{ fontSize: 10, color: "#999", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                client / business name
              </div>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Rosa's Bakery"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#000",
                  border: "1px solid #333",
                  borderRadius: 0,
                  padding: "10px 12px",
                  color: "#fff",
                  fontFamily: mono,
                  fontSize: 12,
                  marginBottom: 16,
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#fff")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
              <div style={{ fontSize: 10, color: "#999", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                describe the business & what the site needs
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="a family-owned bakery in Austin, warm and rustic feel, needs a menu section and hours..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#000",
                  border: "1px solid #333",
                  borderRadius: 0,
                  padding: "10px 12px",
                  color: "#fff",
                  fontFamily: mono,
                  fontSize: 12,
                  resize: "none",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#fff")}
                onBlur={(e) => (e.target.style.borderColor = "#333")}
              />
              <button
                onClick={generate}
                disabled={busy || !clientName.trim() || !prompt.trim()}
                style={{
                  width: "100%",
                  marginTop: 16,
                  background: busy ? "#1a1a1a" : "#fff",
                  color: busy ? "#666" : "#000",
                  border: busy ? "1px solid #333" : "none",
                  borderRadius: 0,
                  padding: "12px 10px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                {busy ? "generating…" : "generate site →"}
              </button>
              {error && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#fff",
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    padding: "8px 10px",
                    marginTop: 10,
                  }}
                >
                  ! {error}
                </div>
              )}
            </div>
          </div>
        )}

        {!showNew && !active && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#444",
              fontSize: 12,
              letterSpacing: "0.02em",
            }}
          >
            select a client site, or create a new one
          </div>
        )}

        {!showNew && active && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid #333",
              }}
            >
              <span style={{ fontSize: 12, fontFamily: display, fontWeight: 600 }}>
                {active.client_name}
              </span>
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  onClick={() => setView("preview")}
                  style={{
                    background: view === "preview" ? "#fff" : "none",
                    color: view === "preview" ? "#000" : "#999",
                    border: "1px solid #333",
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 0,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  preview
                </button>
                <button
                  onClick={() => setView("code")}
                  style={{
                    background: view === "code" ? "#fff" : "none",
                    color: view === "code" ? "#000" : "#999",
                    border: "1px solid #333",
                    borderLeft: "none",
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 0,
                    cursor: "pointer",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  code
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: "#0a0a0a", minHeight: 0 }}>
              {active.status === "generating" && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#999",
                    letterSpacing: "0.05em",
                  }}
                >
                  generating…
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
                <pre
                  style={{
                    height: "100%",
                    overflow: "auto",
                    padding: 18,
                    fontSize: 11,
                    color: "#ccc",
                    whiteSpace: "pre-wrap",
                    fontFamily: mono,
                  }}
                >
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
