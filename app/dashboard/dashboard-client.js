"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { PLAN_LIMITS } from "@/lib/plans";
import { readReferralCode, clearReferralCode } from "@/lib/referral";

export default function DashboardClient({ initialProjects }) {
  const supabase = createClient();
  const [tab, setTab] = useState("sites");
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("preview");
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const active = projects.find((p) => p.id === activeId);
  const accent = "linear-gradient(90deg, #8B5CF6, #22D3EE)";
  const display = "'Space Grotesk', sans-serif";
  const body = "'Inter', sans-serif";
  const [billingStatus, setBillingStatus] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  async function loadBillingStatus() {
    const res = await fetch("/api/billing-status");
    const data = await res.json();
    setBillingStatus(data);
  }

  useEffect(() => {
    loadProfile();
    loadBillingStatus();
  }, [supabase]);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      let { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data) {
        // Brand new user with no profile row yet — create their free
        // trial row now so Billing shows it correctly right away, and
        // pass along whatever referral code was captured on landing.
        await fetch("/api/ensure-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: readReferralCode() }),
        });
        clearReferralCode();
        const retry = await supabase.from("profiles").select("*").eq("id", user.id).single();
        data = retry.data;
      }
      setProfile(data);
    }
  }

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
        body: JSON.stringify({ clientName, prompt, photoUrls }),
      });
      const result = await res.json();

      if (res.status === 402) {
        if (result.error === "site_limit") {
          setError(result.message + " Delete an existing site to free up a slot, or upgrade your plan.");
          return;
        }
        window.location.href = "/pricing";
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setActiveId(result.id);
      setClientName("");
      setPrompt("");
      setPhotoUrls([]);
      loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const [domainInput, setDomainInput] = useState("");
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [leadLocation, setLeadLocation] = useState("");
  const [leadCategory, setLeadCategory] = useState("");
  const [leadResults, setLeadResults] = useState(null);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [siteSearch, setSiteSearch] = useState("");

  async function findLeads() {
    if (!leadLocation.trim() || !leadCategory.trim()) return;
    setLeadBusy(true);
    setLeadError("");
    setLeadResults(null);
    try {
      const res = await fetch("/api/find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: leadLocation, category: leadCategory }),
      });
      const result = await res.json();

      if (res.status === 402) {
        setLeadError(result.message);
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      setLeadResults(result.leads);
      loadProfile();
    } catch (err) {
      setLeadError(err.message);
    } finally {
      setLeadBusy(false);
    }
  }

  function generateForLead(lead) {
    setTab("sites");
    setActiveId(null);
    setClientName(lead.name);
    setPhotoUrls([]);
    setPrompt(
      `${lead.name} is a local business${lead.address ? ` located at ${lead.address}` : ""}${
        lead.phone ? `, phone ${lead.phone}` : ""
      }. Build them a professional website that fits their industry.`
    );
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const path = `${user?.id || "anon"}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("client-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("client-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError("Photo upload failed: " + err.message);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(url) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  async function editSite() {
    if (!editInstruction.trim() || !active) return;
    setEditBusy(true);
    setEditError("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: active.id, instruction: editInstruction }),
      });
      const result = await res.json();

      if (res.status === 402) {
        window.location.href = "/pricing";
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setEditInstruction("");
      loadProfile();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  }


  async function connectDomain(project) {
    if (!domainInput.trim()) return;
    setDomainBusy(true);
    setDomainError("");
    try {
      const res = await fetch("/api/connect-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, domain: domainInput.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setDomainInput("");
    } catch (err) {
      setDomainError(err.message);
    } finally {
      setDomainBusy(false);
    }
  }

  async function togglePublish(project) {
    setPublishError("");
    const updates = { published: !project.published };

    // Generate a sitebric.com subdomain the first time a site is published.
    if (!project.published && !project.slug) {
      const base = project.client_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40) || "site";

      let slug = base;
      let attempt = 0;
      while (attempt < 5) {
        const { data: existing } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        attempt++;
        slug = `${base}${Math.floor(100 + Math.random() * 900)}`;
      }
      updates.slug = slug;
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", project.id)
      .select()
      .single();

    // Without this the button just does nothing on failure. The usual
    // cause is supabase/schema.sql not having been re-run, so the
    // published/slug columns this writes don't exist yet.
    if (error) {
      setPublishError(
        `Couldn't ${project.published ? "unpublish" : "publish"} this site: ${error.message}`
      );
      return;
    }

    if (data) {
      setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));
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

  // Reflects whether a site is actually reachable, not just whether it
  // finished generating. A finished-but-unpublished site isn't on the
  // internet yet, so labelling it "live" was misleading.
  function projectMeta(project) {
    if (project.status === "generating") return { color: "#22D3EE", label: "generating" };
    if (project.status === "error") return { color: "#F87171", label: "failed" };
    if (project.published) return { color: "#4ADE80", label: "live" };
    // Amber, not grey: an unpublished site is waiting on the user, so it
    // should read as a pending action rather than blend into the card.
    return { color: "#FBBF24", label: "ready to publish" };
  }

  const currentPlan = profile?.plan || "none";
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.none;
  const sitesUsed = projects.length;
  const gensUsed = profile?.generations_used || 0;
  const searchesUsedBilling = profile?.searches_used || 0;

  const navItems = [
    { id: "sites", label: "Sites", icon: "◆" },
    { id: "leads", label: "Find Leads", icon: "◎" },
    { id: "billing", label: "Billing", icon: "▣" },
    { id: "profile", label: "Profile", icon: "●" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="sb-dash-shell" style={{ height: "100vh", display: "flex", color: "#F2F0FA", background: "#0A0A10", fontFamily: body, position: "relative" }}>
      <style>{`
        @keyframes sbDashDrift1 {
          0%   { transform: translate(-50%, 0) scale(1); }
          50%  { transform: translate(-42%, 8%) scale(1.15); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        @keyframes sbDashDrift2 {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50%  { transform: translate(10%, -8%) scale(1.2); opacity: 0.65; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        .sb-dash-ambient { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .sb-dash-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
        .sb-dash-orb-a {
          top: -30%; left: 50%; width: 1100px; height: 1100px;
          background: radial-gradient(circle, rgba(139,92,246,0.26) 0%, rgba(34,211,238,0.12) 45%, transparent 70%);
          animation: sbDashDrift1 12s ease-in-out infinite;
        }
        .sb-dash-orb-b {
          bottom: -20%; right: -10%; width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%);
          animation: sbDashDrift2 15s ease-in-out infinite;
        }
        .sb-project-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .sb-project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(139,92,246,0.18);
          border-color: rgba(139,92,246,0.35);
        }
        .sb-sidebar-item {
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .sb-nav-tab {
          transition: background 0.15s ease, color 0.15s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-dash-orb-a, .sb-dash-orb-b { animation: none; }
        }
        /* The desktop layout is a fixed 300px sidebar beside the workspace.
           On a phone that leaves almost nothing for the workspace, so stack
           them instead and let the page scroll normally. */
        @media (max-width: 860px) {
          .sb-dash-shell {
            flex-direction: column;
            height: auto !important;
            min-height: 100vh;
            /* dvh accounts for the iOS Safari toolbar; vh above is the
               fallback for browsers that don't support it. */
            min-height: 100dvh;
          }
          .sb-dash-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          /* Cap the project list so a long list can't push the workspace
             off the bottom of the screen. */
          .sb-dash-projects { max-height: 45vh; }
          .sb-dash-main {
            overflow: visible !important;
            min-height: 70vh;
          }
          .sb-dash-preview { min-height: 70vh; }
          /* With a project open, the list above adds nothing but eats
             most of the screen — hide it and rely on the back button
             instead so the preview actually gets room to breathe. */
          .sb-dash-sidebar--project-open { display: none; }
          .sb-mobile-back { display: inline-flex !important; }
        }
        .sb-mobile-back { display: none; }
      `}</style>

      <div
        className={`sb-dash-sidebar${tab === "sites" && active ? " sb-dash-sidebar--project-open" : ""}`}
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
            site
            <span style={{ background: accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              bric
            </span>
          </span>
          <button onClick={signOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        {/* ===== TAB NAV ===== */}
        <div style={{ display: "flex", flexDirection: "column", padding: "12px 12px 0" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setActiveId(null);
              }}
              className="sb-nav-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                background: tab === item.id ? "rgba(139,92,246,0.1)" : "transparent",
                color: tab === item.id ? "#F2F0FA" : "rgba(255,255,255,0.5)",
                border: "none",
                borderLeft: tab === item.id ? "2px solid #8B5CF6" : "2px solid transparent",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: display,
                cursor: "pointer",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  background: tab === item.id ? accent : "transparent",
                  WebkitBackgroundClip: tab === item.id ? "text" : "unset",
                  WebkitTextFillColor: tab === item.id ? "transparent" : "inherit",
                  opacity: tab === item.id ? 1 : 0.5,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        {tab === "sites" && (
          <>
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

            <div style={{ padding: "0 12px 10px" }}>
              <input
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Search your sites…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: "#fff",
                  fontFamily: body,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            <div className="sb-dash-projects" style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
              {projects.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: 12, lineHeight: 1.6 }}>
                  No client sites yet — type a business name and description above, then hit "Generate site" to
                  create your first one.
                </div>
              )}
              {projects.length > 0 &&
                projects.filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase())).length ===
                  0 && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 12 }}>
                    No sites match "{siteSearch}".
                  </div>
                )}
              {projects
                .filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase()))
                .map((p) => {
                const meta = projectMeta(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className="sb-sidebar-item"
                    style={{
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 12,
                      marginBottom: 8,
                      fontSize: 13,
                      border: p.id === activeId ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                      background: p.id === activeId ? "rgba(139,92,246,0.08)" : "transparent",
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginTop: 4, color: meta.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 5px ${meta.color}` }} />
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="sb-dash-main" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        {/* ===== SITES TAB ===== */}
        {tab === "sites" && !active && (
          <>
            <div className="sb-dash-ambient">
              <div className="sb-dash-orb sb-dash-orb-a" />
              <div className="sb-dash-orb sb-dash-orb-b" />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "56px 24px",
                position: "relative",
                zIndex: 1,
                overflowY: "auto",
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 32, marginBottom: 10, textAlign: "center" }}>
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
                  marginBottom: 60,
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

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px dashed rgba(255,255,255,0.2)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 14,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    cursor: photoUploading ? "default" : "pointer",
                  }}
                >
                  {photoUploading ? "Uploading…" : "📷 Upload real photos of the business (optional)"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    style={{ display: "none" }}
                  />
                </label>

                {photoUrls.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {photoUrls.map((url) => (
                      <div key={url} style={{ position: "relative", width: 56, height: 56 }}>
                        <img
                          src={url}
                          alt=""
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                        <button
                          onClick={() => removePhoto(url)}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#F87171",
                            color: "#fff",
                            border: "none",
                            fontSize: 11,
                            cursor: "pointer",
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

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

              {projects.length > 0 && (
                <div style={{ width: "100%", maxWidth: 1000 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16, fontWeight: 500 }}>
                    Your client sites
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                    {projects
                      .filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase()))
                      .map((p) => {
                      const meta = projectMeta(p);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setActiveId(p.id)}
                          className="sb-project-card"
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: 100,
                              background:
                                p.status === "done"
                                  ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(34,211,238,0.15))"
                                  : "rgba(255,255,255,0.03)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: display,
                              fontWeight: 700,
                              fontSize: 22,
                              color: "rgba(255,255,255,0.15)",
                            }}
                          >
                            {p.client_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{p.client_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: meta.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 5px ${meta.color}` }} />
                              {meta.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "sites" && active && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <button
                  onClick={() => setActiveId(null)}
                  className="sb-mobile-back"
                  style={{
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontFamily: body,
                    cursor: "pointer",
                    padding: "4px 4px 4px 0",
                    flexShrink: 0,
                  }}
                >
                  ← Sites
                </button>
                <span style={{ fontSize: 14, fontFamily: display, fontWeight: 600 }}>{active.client_name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                {active.published && (
                  <a
                    href={active.slug ? `https://${active.slug}.sitebric.com` : `/s/${active.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#22D3EE", textDecoration: "none" }}
                  >
                    {active.slug ? `${active.slug}.sitebric.com` : "View live link"} →
                  </a>
                )}
                <button
                  onClick={() => togglePublish(active)}
                  disabled={active.status !== "done"}
                  style={{
                    background: active.published ? "rgba(255,255,255,0.08)" : accent,
                    color: active.published ? "#F2F0FA" : "#0A0A10",
                    border: active.published ? "1px solid rgba(255,255,255,0.15)" : "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: active.status !== "done" ? "default" : "pointer",
                    opacity: active.status !== "done" ? 0.4 : 1,
                  }}
                >
                  {active.published ? "Unpublish" : "Publish"}
                </button>
              </div>
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
            {publishError && (
              <div
                style={{
                  fontSize: 12,
                  color: "#FCA5A5",
                  background: "rgba(220,38,38,0.1)",
                  borderBottom: "1px solid rgba(220,38,38,0.25)",
                  padding: "10px 20px",
                }}
              >
                {publishError}
              </div>
            )}
            {active.published && (
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {active.custom_domain ? (
                  <div>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      Connected domain: <span style={{ color: "#22D3EE" }}>{active.custom_domain}</span>
                    </span>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "#C4B5FD",
                        background: "rgba(139,92,246,0.08)",
                        border: "1px solid rgba(139,92,246,0.15)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        maxWidth: 520,
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 6, color: "#F2F0FA" }}>
                        One more step — point the domain here
                      </strong>
                      Log into wherever <code>{active.custom_domain}</code> was purchased (Namecheap,
                      GoDaddy, etc.), find its DNS or nameserver settings, and set the nameservers to:
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: "monospace",
                          fontSize: 12,
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: 6,
                          padding: "8px 10px",
                        }}
                      >
                        ns1.vercel-dns.com
                        <br />
                        ns2.vercel-dns.com
                      </div>
                      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.5)" }}>
                        This can take anywhere from a few minutes to a few hours to take effect. Once it
                        does, the domain will start showing this site automatically.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="clientswebsite.com"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 12,
                          outline: "none",
                          width: 220,
                        }}
                      />
                      <button
                        onClick={() => connectDomain(active)}
                        disabled={domainBusy || !domainInput.trim()}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#F2F0FA",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: domainBusy ? "default" : "pointer",
                        }}
                      >
                        {domainBusy ? "Connecting…" : "Connect domain"}
                      </button>
                      {domainError && (
                        <span style={{ fontSize: 11, color: "#FCA5A5" }}>{domainError}</span>
                      )}
                    </div>
                    <a
                      href="https://www.namecheap.com/domains/registration/results/"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: display,
                        background: accent,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textDecoration: "none",
                      }}
                    >
                      Don't have a domain yet? Search for one on Namecheap →
                    </a>
                  </div>
                )}
              </div>
            )}
            <div className="sb-dash-preview" style={{ flex: 1, background: "#0A0A10", minHeight: 0, position: "relative" }}>
              {active.status === "generating" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  Generating…
                </div>
              )}
              {active.status === "done" && view === "preview" && (
                // An iframe's percentage height doesn't reliably resolve
                // through a chain of flex containers (a long-standing
                // browser quirk for replaced elements) — it was silently
                // collapsing to the ~150px UA default on mobile, where the
                // shell layout switches to a stack of nested flex boxes
                // with no single ancestor giving it an explicit height.
                // Absolute-positioning it against this relatively
                // positioned parent sidesteps that entirely.
                <iframe
                  title="preview"
                  srcDoc={active.code}
                  sandbox="allow-scripts allow-modals allow-forms"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "white" }}
                />
              )}
              {active.status === "done" && view === "code" && (
                <pre style={{ height: "100%", overflow: "auto", padding: 20, fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                  {active.code}
                </pre>
              )}
            </div>
            {active.status === "done" && (
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.015)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !editBusy) editSite();
                    }}
                    placeholder="Describe a change — e.g. 'make the hero image a plumber instead' or 'add a testimonials section'"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 13,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#8B5CF6")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                  <button
                    onClick={editSite}
                    disabled={editBusy || !editInstruction.trim()}
                    style={{
                      background: editBusy ? "rgba(255,255,255,0.08)" : accent,
                      color: editBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 20px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: editBusy ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editBusy ? "Applying…" : "Apply edit"}
                  </button>
                </div>
                {editError && (
                  <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{editError}</div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== FIND LEADS TAB ===== */}
        {tab === "leads" && (
          <div style={{ padding: "48px 40px", maxWidth: 1200, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Find Leads</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 12 }}>
              Search for local businesses with no website — instant client leads.
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "#C4B5FD",
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 999,
                padding: "5px 12px",
                marginBottom: 20,
              }}
            >
              {profile?.searches_used ?? 0} / {limits.searches} searches used this month
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 22,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  value={leadCategory}
                  onChange={(e) => setLeadCategory(e.target.value)}
                  placeholder="Business type — e.g. locksmith"
                  style={{
                    flex: "1 1 200px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <input
                  value={leadLocation}
                  onChange={(e) => setLeadLocation(e.target.value)}
                  placeholder="City — e.g. Austin, TX"
                  style={{
                    flex: "1 1 200px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <button
                  onClick={findLeads}
                  disabled={leadBusy || !leadCategory.trim() || !leadLocation.trim()}
                  style={{
                    background: leadBusy ? "rgba(255,255,255,0.08)" : accent,
                    color: leadBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 22px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: leadBusy ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {leadBusy ? "Searching…" : "Search"}
                </button>
              </div>
              {leadError && (
                <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 12 }}>{leadError}</div>
              )}
            </div>

            {leadResults && leadResults.length === 0 && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                No websiteless businesses found for that search — try a different city or category.
              </div>
            )}

            {leadResults && leadResults.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: 14,
                }}
              >
                {leadResults.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      borderRadius: 14,
                      padding: "16px 18px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{lead.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                        {lead.address}
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}>
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                            style={{ color: "#22D3EE", textDecoration: "none" }}
                          >
                            📞 {lead.phone}
                          </a>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>No phone listed</span>
                        )}
                        {lead.mapsUrl && (
                          <a
                            href={lead.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#C4B5FD", textDecoration: "none" }}
                          >
                            View on Maps →
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => generateForLead(lead)}
                      style={{
                        width: "100%",
                        background: accent,
                        color: "#0A0A10",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Generate site →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== BILLING TAB ===== */}
        {tab === "billing" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Billing</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Your current plan and usage for this billing cycle.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Current plan</div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 20 }}>{limits.label}</div>
                </div>
                <a
                  href="/pricing"
                  style={{
                    background: accent,
                    color: "#0A0A10",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "10px 18px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  {currentPlan === "none" || currentPlan === "trial" ? "Choose a plan" : "Change plan"}
                </a>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Client sites</span>
                  <span>{sitesUsed} / {limits.sites}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.sites ? Math.min(100, (sitesUsed / limits.sites) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Generations this month</span>
                  <span>{gensUsed} / {limits.generations}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.generations ? Math.min(100, (gensUsed / limits.generations) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Lead searches this month</span>
                  <span>{searchesUsedBilling} / {limits.searches}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.searches ? Math.min(100, (searchesUsedBilling / limits.searches) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>
            </div>

            {billingStatus?.cancelAtPeriodEnd && (
              <div
                style={{
                  fontSize: 13,
                  color: "#FCD34D",
                  background: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                Your subscription is set to cancel on{" "}
                {billingStatus.currentPeriodEnd
                  ? new Date(billingStatus.currentPeriodEnd * 1000).toLocaleDateString()
                  : "the end of this billing period"}
                . You'll keep full access until then.
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  const res = await fetch("/api/billing-portal", { method: "POST" });
                  const result = await res.json();
                  if (result.url) {
                    window.location.href = result.url;
                  } else {
                    alert(result.error || "Couldn't open billing portal.");
                  }
                }}
                disabled={currentPlan === "none" || currentPlan === "trial"}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#F2F0FA",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: currentPlan === "none" || currentPlan === "trial" ? "default" : "pointer",
                  opacity: currentPlan === "none" || currentPlan === "trial" ? 0.4 : 1,
                }}
              >
                Manage billing
              </button>

              {currentPlan !== "none" && billingStatus?.hasSubscription && (
                billingStatus.cancelAtPeriodEnd ? (
                  <button
                    onClick={async () => {
                      setCancelBusy(true);
                      const res = await fetch("/api/resume-subscription", { method: "POST" });
                      if (res.ok) {
                        await loadBillingStatus();
                      } else {
                        const result = await res.json();
                        alert(result.error || "Couldn't resume subscription.");
                      }
                      setCancelBusy(false);
                    }}
                    disabled={cancelBusy}
                    style={{
                      background: accent,
                      color: "#0A0A10",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: cancelBusy ? "default" : "pointer",
                    }}
                  >
                    {cancelBusy ? "Resuming…" : "Resume subscription"}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "Cancel your subscription? You'll keep access until the end of your current billing period, then your plan will end."
                      );
                      if (!confirmed) return;
                      setCancelBusy(true);
                      const res = await fetch("/api/cancel-subscription", { method: "POST" });
                      if (res.ok) {
                        await loadBillingStatus();
                      } else {
                        const result = await res.json();
                        alert(result.error || "Couldn't cancel subscription.");
                      }
                      setCancelBusy(false);
                    }}
                    disabled={cancelBusy}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: cancelBusy ? "default" : "pointer",
                    }}
                  >
                    {cancelBusy ? "Cancelling…" : "Cancel subscription"}
                  </button>
                )
              )}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              Generation usage resets at the start of each billing cycle. Use "Manage billing" to update your card or
              view invoices, or use "Cancel subscription" to cancel directly — no need to leave the dashboard.
            </div>

          </div>
        )}

        {/* ===== PROFILE TAB ===== */}
        {tab === "profile" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Profile</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Your account details.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#0A0A10",
                  flexShrink: 0,
                }}
              >
                {user?.email ? user.email.slice(0, 1).toUpperCase() : "?"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{user?.email || "Loading..."}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F2F0FA",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 18px",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {tab === "settings" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Settings</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Account preferences.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Email</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
                {user?.email || "—"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                To change your login email, sign in with a different address next time — a new account isn't created if you've used it before.
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Need help?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                Questions, bugs, or feedback — reach out anytime at{" "}
                <a href="mailto:supportsitebric@gmail.com" style={{ color: "#22D3EE" }}>
                  supportsitebric@gmail.com
                </a>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "#F87171" }}>Danger zone</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
                Deleting your account removes all client sites permanently. This can't be undone.
              </div>
              <button
                onClick={() => alert("Account deletion isn't wired up yet — for now, email support to request this.")}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#F87171",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Delete account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
