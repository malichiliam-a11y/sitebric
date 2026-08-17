"use client";

import { useState } from "react";
import { t } from "@/lib/theme";
import { PLAN_LIMITS } from "@/lib/plans";

const PLANS = ["starter", "growth", "pro", "trial"];

export default function ActivateForm() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("starter");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  async function repairSites() {
    if (repairBusy) return;
    setRepairBusy(true);
    setRepairResult(null);
    try {
      const res = await fetch("/api/admin/repair-sites", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Repair failed.");
      setRepairResult(data);
    } catch (err) {
      setRepairResult({ error: err.message });
    } finally {
      setRepairBusy(false);
    }
  }

  async function activate() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't activate that plan.");
      setResult(data);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, padding: "48px 6%" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, margin: "0 0 6px" }}>Activate a plan manually</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 28px" }}>
          For customers Stripe can&apos;t reach — EcoCash in Zimbabwe, domestic-only cards, anywhere
          checkout structurally doesn&apos;t work. Take payment however you can, then switch their plan
          on here. They must have signed up first.
        </p>

        <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
          THEIR EMAIL
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          type="email"
          style={{ ...field, marginBottom: 18 }}
        />

        <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
          PLAN
        </label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} style={{ ...field, marginBottom: 22 }}>
          {PLANS.map((p) => (
            <option key={p} value={p} style={{ background: "#14141C" }}>
              {PLAN_LIMITS[p].label} — {PLAN_LIMITS[p].sites} sites, {PLAN_LIMITS[p].generations} generations,{" "}
              {PLAN_LIMITS[p].searches} searches
            </option>
          ))}
        </select>

        <button
          onClick={activate}
          disabled={busy || !email.trim()}
          style={{
            width: "100%",
            background: busy || !email.trim() ? "rgba(255,255,255,0.08)" : "#fff",
            color: busy || !email.trim() ? "rgba(255,255,255,0.4)" : "#0A0A10",
            border: "none",
            borderRadius: 10,
            padding: "13px 10px",
            fontSize: 14,
            fontWeight: 700,
            cursor: busy || !email.trim() ? "default" : "pointer",
          }}
        >
          {busy ? "Activating…" : "Activate plan"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "#FCA5A5",
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 10,
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.3)",
              color: "#86EFAC",
              fontSize: 13.5,
              lineHeight: 1.6,
            }}
          >
            <strong>{result.email}</strong> is now on {PLAN_LIMITS[result.plan].label}
            {" — "}
            {result.limits.sites} sites, {result.limits.generations} generations,{" "}
            {result.limits.searches} lead searches. Their usage was reset, so this is a fresh month.
          </div>
        )}

        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginTop: 28 }}>
          There is no subscription behind this, so nothing renews and nothing bills again. Note when
          their month is up and collect payment before extending it.
        </p>

        <div style={{ marginTop: 44, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>Repair every site&apos;s buttons</h2>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 16px" }}>
            Points dead call-to-action links at the contact section and guarantees every contact form
            reaches your dashboard. Runs over every site already generated, including published ones.
            No AI is involved, so it costs nothing and uses no generations. Safe to run more than once.
          </p>
          <button
            onClick={repairSites}
            disabled={repairBusy}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 10,
              padding: "12px 20px",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: repairBusy ? "default" : "pointer",
            }}
          >
            {repairBusy ? "Repairing…" : "Repair all sites"}
          </button>

          {repairResult && !repairResult.error && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 10,
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.3)",
                color: "#86EFAC",
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              Repaired <strong>{repairResult.repaired}</strong> site
              {repairResult.repaired === 1 ? "" : "s"} — {repairResult.totalDeadLinksFixed} dead
              button{repairResult.totalDeadLinksFixed === 1 ? "" : "s"} fixed.{" "}
              {repairResult.untouched} already fine.
            </div>
          )}
          {repairResult?.error && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.3)",
                color: "#FCA5A5",
                fontSize: 13.5,
              }}
            >
              {repairResult.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
