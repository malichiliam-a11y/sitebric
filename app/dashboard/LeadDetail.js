"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { leadScript } from "@/lib/lead-script";

// Everything about one business, and the words to say to them.
//
// Split out of dashboard-client.js rather than added to it. That file is
// already the entire workspace in one component; this is a self-contained
// screen with its own state, and the only thing it needs from the parent
// is the lead itself and four callbacks.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

const panel = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "16px 18px",
};

function Action({ href, onClick, label, hint, primary, disabled }) {
  const style = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: "1 1 150px",
    textAlign: "left",
    background: primary ? "#FFFFFF" : "rgba(255,255,255,0.05)",
    color: primary ? "#0A0A10" : disabled ? "rgba(255,255,255,0.3)" : "#FFFFFF",
    border: primary ? "none" : "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "11px 14px",
    fontFamily: BODY,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    cursor: disabled ? "default" : "pointer",
  };

  const inner = (
    <>
      <span>{label}</span>
      {hint && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: primary ? "rgba(10,10,16,0.6)" : "rgba(255,255,255,0.74)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hint}
        </span>
      )}
    </>
  );

  // A disabled action stays on screen as a greyed-out box rather than
  // disappearing: "No phone listed" is information, and a row of buttons
  // that changes shape from one lead to the next is harder to use at
  // speed than one that doesn't.
  if (disabled) return <div style={style}>{inner}</div>;

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("tel:") ? undefined : "_blank"}
        rel="noreferrer noopener"
        style={style}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

function Copyable({ id, label, text, copiedKey, onCopy, mono }) {
  const copied = copiedKey === id;
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() => onCopy(id, text)}
          style={{
            background: "transparent",
            border: "none",
            color: copied ? "#4ADE80" : "rgba(255,255,255,0.5)",
            fontFamily: BODY,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.62,
          color: "rgba(255,255,255,0.9)",
          whiteSpace: "pre-wrap",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : BODY,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function LeadDetail({
  lead,
  category,
  location,
  built,
  link,
  saved,
  onSave,
  onUnsave,
  onGenerate,
  onClose,
}) {
  const [copiedKey, setCopiedKey] = useState("");
  const [copyError, setCopyError] = useState("");
  const [section, setSection] = useState("call");

  // Escape closes it. Without this the only way out of a full-screen
  // panel is finding the X, which on a phone is a reach.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!lead || typeof document === "undefined") return null;

  const script = leadScript(lead, { category, location, built, link });
  const dial = String(lead.phoneDial || lead.phone || "").replace(/[^0-9+]/g, "");

  async function copy(id, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError("");
      setCopiedKey(id);
      setTimeout(() => setCopiedKey((current) => (current === id ? "" : current)), 1600);
    } catch {
      setCopyError("Your browser blocked the copy — select the text and copy it by hand.");
    }
  }

  const tabStyle = (id) => ({
    background: section === id ? "rgba(255,255,255,0.1)" : "transparent",
    border: "1px solid",
    borderColor: section === id ? "rgba(255,255,255,0.2)" : "transparent",
    borderRadius: 999,
    padding: "6px 14px",
    color: section === id ? "#FFFFFF" : "rgba(255,255,255,0.5)",
    fontFamily: BODY,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  });

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(6,6,10,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${lead.name} details`}
        style={{
          width: "min(560px, 100%)",
          height: "100%",
          background: "#0C0C12",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: BODY,
          color: "#FFFFFF",
        }}
      >
        {/* Header — stays put while the script scrolls, because the
            business name is what stops you calling the wrong one. */}
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: 19,
                  lineHeight: 1.25,
                  marginBottom: 5,
                }}
              >
                {lead.name}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.64)" }}>
                {lead.address || "No address listed"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                width: 32,
                height: 32,
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginTop: 11,
              fontSize: 12.5,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              color: lead.hasWebsite ? "rgba(255,255,255,0.74)" : "#4ADE80",
              background: lead.hasWebsite ? "rgba(255,255,255,0.06)" : "rgba(74,222,128,0.12)",
            }}
          >
            {lead.hasWebsite ? "HAS A SITE" : "NO WEBSITE"}
          </div>
          {built && (
            <span
              style={{
                display: "inline-flex",
                marginLeft: 8,
                marginTop: 11,
                fontSize: 12.5,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 999,
                color: "#0A0A10",
                background: "#FFFFFF",
              }}
            >
              SITE BUILT
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 40px", minHeight: 0 }}>
          {/* The buttons come first. Someone opening this has decided to
              act on this business; the script is what they read while the
              phone rings. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <Action
              href={dial ? `tel:${dial}` : undefined}
              disabled={!dial}
              primary={Boolean(dial)}
              label={dial ? "Call now" : "No phone listed"}
              hint={lead.phone || "Google has no number for them"}
            />
            <Action
              href={lead.website || undefined}
              disabled={!lead.website}
              label={lead.website ? "View their website" : "No website"}
              hint={lead.website ? lead.website.replace(/^https?:\/\//, "").slice(0, 40) : "That's the pitch"}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            <Action
              href={lead.mapsUrl || undefined}
              disabled={!lead.mapsUrl}
              label="Google Maps"
              hint="Photos, hours, reviews"
            />
            <Action
              onClick={() => (saved ? onUnsave(lead.id) : onSave(lead))}
              label={saved ? "Remove from list" : "Add to call list"}
              hint={saved ? "It's on your list" : "Saved so you can call it later"}
            />
          </div>

          <button
            type="button"
            onClick={() => onGenerate(lead)}
            style={{
              width: "100%",
              background: built ? "rgba(255,255,255,0.06)" : "#FFFFFF",
              color: built ? "#FFFFFF" : "#0A0A10",
              border: built ? "1px solid rgba(255,255,255,0.14)" : "none",
              borderRadius: 10,
              padding: "13px 16px",
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            {built ? "Build them another site →" : "Build their website first →"}
          </button>

          <div style={{ ...panel, marginBottom: 16, borderColor: "rgba(255,255,255,0.14)" }}>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              {script.angle}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{script.prep.text}</div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            <button type="button" style={tabStyle("call")} onClick={() => setSection("call")}>
              Call script
            </button>
            <button type="button" style={tabStyle("objections")} onClick={() => setSection("objections")}>
              If they say…
            </button>
            <button type="button" style={tabStyle("written")} onClick={() => setSection("written")}>
              Text &amp; email
            </button>
          </div>

          {copyError && (
            <div style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 12 }}>{copyError}</div>
          )}

          {section === "call" && (
            <div style={panel}>
              {script.call.map((step) => (
                <Copyable
                  key={step.id}
                  id={step.id}
                  label={step.label}
                  text={step.text}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              ))}
              <button
                type="button"
                onClick={() => copy("full", script.full)}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: copiedKey === "full" ? "#4ADE80" : "#FFFFFF",
                  fontFamily: BODY,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedKey === "full" ? "Whole script copied" : "Copy the whole script"}
              </button>
            </div>
          )}

          {section === "objections" && (
            <div style={panel}>
              {script.objections.map((o, i) => (
                <div key={i} style={{ marginBottom: i === script.objections.length - 1 ? 0 : 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{o.q}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.62, color: "rgba(255,255,255,0.86)" }}>
                    {o.a}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "written" && (
            <div style={panel}>
              <Copyable
                id="sms"
                label="Text message"
                text={script.sms}
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <Copyable
                id="voicemail"
                label="Voicemail — most calls end here"
                text={script.voicemail}
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <Copyable
                id="subject"
                label="Email subject"
                text={script.email.subject}
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <Copyable
                id="email"
                label="Email"
                text={script.email.body}
                copiedKey={copiedKey}
                onCopy={copy}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
