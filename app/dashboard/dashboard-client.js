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

  // Poll while something is generating, so the dashboard updates without a refresh
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

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        color: "#F0EEE6",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          width: 280,
          borderRight: "1px solid #232427",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #232427",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14 }}>
            site<span style={{ color: "#6C63FF" }}>forge</span>
          </span>
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: "none",
              color: "#5A5C61",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            sign out
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <button
            onClick={() => setShowNew(true)}
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
            + new client site
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {projects.length === 0 && (
            <div style={{ fontSize: 11, color: "#5A5C61", padding: 10 }}>
              No client sites yet.
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                cursor: "pointer",
                padding: "8px 10px",
                borderRadius: 6,
                marginBottom: 4,
                fontSize: 12,
                border:
                  p.id === activeId
                    ? "1px solid #6C63FF"
                    : "1px solid transparent",
                background: p.id === activeId ? "#15131F" : "transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{p.client_name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(p.id);
                  }}
                  style={{ color: "#5A5C61", fontSize: 10 }}
                >
                  ✕
                </span>
              </div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {p.status === "generating" && (
                  <span style={{ color: "#E8A33D" }}>generating…</span>
                )}
                {p.status === "done" && (
                  <span style={{ color: "#3A9188" }}>● live</span>
                )}
                {p.status === "error" && (
                  <span style={{ color: "#E06C5C" }}>● failed</span>
                )}
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
                maxWidth: 420,
                border: "1px solid #232427",
                borderRadius: 8,
                padding: 20,
                background: "#131316",
              }}
            >
              <button
                onClick={() => setShowNew(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8A8C91",
                  fontSize: 11,
                  cursor: "pointer",
                  marginBottom: 14,
                }}
              >
                ← back
              </button>
              <div style={{ fontSize: 11, color: "#8A8C91", marginBottom: 6 }}>
                client / business name
              </div>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Rosa's Bakery"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#0D0E10",
                  border: "1px solid #232427",
                  borderRadius: 6,
                  padding: "8px 10px",
                  color: "#F0EEE6",
                  fontSize: 12,
                  marginBottom: 12,
                }}
              />
              <div style={{ fontSize: 11, color: "#8A8C91", marginBottom: 6 }}>
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
                  background: "#0D0E10",
                  border: "1px solid #232427",
                  borderRadius: 6,
                  padding: "8px 10px",
                  color: "#F0EEE6",
                  fontSize: 12,
                  resize: "none",
                }}
              />
              <button
                onClick={generate}
                disabled={busy || !clientName.trim() || !prompt.trim()}
                style={{
                  width: "100%",
                  marginTop: 12,
                  background: busy ? "#2A2B2E" : "#6C63FF",
                  color: busy ? "#5A5C61" : "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                {busy ? "generating…" : "generate site"}
              </button>
              {error && (
                <div style={{ fontSize: 11, color: "#E06C5C", marginTop: 8 }}>
                  {error}
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
              color: "#3F4045",
              fontSize: 12,
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
                padding: "12px 16px",
                borderBottom: "1px solid #232427",
              }}
            >
              <span style={{ fontSize: 12 }}>{active.client_name}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setView("preview")}
                  style={{
                    background: view === "preview" ? "#1C1D20" : "none",
                    border: "none",
                    color: "#F0EEE6",
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  preview
                </button>
                <button
                  onClick={() => setView("code")}
                  style={{
                    background: view === "code" ? "#1C1D20" : "none",
                    border: "none",
                    color: "#F0EEE6",
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  code
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: "#131316", minHeight: 0 }}>
              {active.status === "generating" && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#8A8C91",
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
                    padding: 16,
                    fontSize: 11,
                    whiteSpace: "pre-wrap",
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
