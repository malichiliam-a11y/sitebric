"use client";

import { DOMAIN_STATES, domainMessage, showsSetup } from "@/lib/domain-status";

// The connected-domain panel: what the domain is doing, and what's left.
//
// It used to be a fixed block of setup instructions under the words
// "Connected domain", shown identically forever — before DNS, during, and
// after. So it read as done the moment it appeared, and there was no way
// to tell a domain that was live from one that had never been pointed
// anywhere. That gap is what generated the support question this replaces.
//
// Its own file for the same reason the receptionist screen is: it can be
// rendered in every state in a browser without a login.
// See app/dev/domain/ and test/domain-ui.mjs.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

const TONES = {
  [DOMAIN_STATES.LIVE]: { dot: "#4ADE80", label: "LIVE", color: "#4ADE80" },
  [DOMAIN_STATES.WAITING_FOR_DNS]: { dot: "#FBBF24", label: "WAITING ON DNS", color: "#FBBF24" },
  [DOMAIN_STATES.NEEDS_VERIFICATION]: { dot: "#FBBF24", label: "NEEDS A RECORD", color: "#FBBF24" },
  [DOMAIN_STATES.UNKNOWN]: {
    dot: "rgba(255,255,255,0.4)",
    label: "CHECKING",
    color: "rgba(255,255,255,0.6)",
  },
};

const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  background: "rgba(0,0,0,0.25)",
  borderRadius: 6,
  padding: "8px 10px",
  wordBreak: "break-all",
};

function Copyable({ text, onCopy, copied }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
      <div style={{ ...mono, flex: 1, minWidth: 0 }}>{text}</div>
      <button
        onClick={() => onCopy(text)}
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 6,
          padding: "7px 12px",
          color: "#fff",
          fontFamily: BODY,
          fontSize: 11.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {copied === text ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function DomainStatus({
  status,
  slug,
  busy = false,
  copied = "",
  onRecheck,
  onCopy,
}) {
  // Null while the first check is in flight. Deliberately not defaulted to
  // "live" or to the old instructions — an unknown domain must never look
  // like a finished one.
  const state = status?.state || DOMAIN_STATES.UNKNOWN;
  const tone = TONES[state] || TONES[DOMAIN_STATES.UNKNOWN];
  const setup = showsSetup(status);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          Connected domain:{" "}
          <span style={{ color: "#FFFFFF" }}>{status?.domain || ""}</span>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: tone.color,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999,
            padding: "3px 9px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: tone.dot,
              flexShrink: 0,
            }}
          />
          {busy ? "CHECKING" : tone.label}
        </span>
        <button
          onClick={onRecheck}
          disabled={busy}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "rgba(255,255,255,0.6)",
            fontFamily: BODY,
            fontSize: 11.5,
            fontWeight: 600,
            textDecoration: "underline",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Checking…" : "Check again"}
        </button>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.72)",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "12px 14px",
          maxWidth: 520,
        }}
      >
        <strong style={{ display: "block", marginBottom: 6, color: "#F2F0FA" }}>
          {state === DOMAIN_STATES.LIVE ? "Done — this domain is serving the site" : "One more step"}
        </strong>

        {domainMessage(status)}

        {state === DOMAIN_STATES.NEEDS_VERIFICATION && status?.record && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
              Type {status.record.type} · Name
            </div>
            <Copyable text={status.record.name} onCopy={onCopy} copied={copied} />
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
              Value
            </div>
            <Copyable text={status.record.value} onCopy={onCopy} copied={copied} />
          </div>
        )}

        {state === DOMAIN_STATES.WAITING_FOR_DNS && (
          <div style={{ marginTop: 10 }}>
            {/* Only when they still have to do it. Once the nameservers
                are right, repeating them reads as "you got it wrong". */}
            {status?.pointingHere !== true && (
              <>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>
                  Set the domain&apos;s nameservers to these two — that&apos;s the
                  &ldquo;Custom DNS&rdquo; setting at your registrar, not a DNS record.
                </div>
                {(status?.nameservers || []).map((ns) => (
                  <Copyable key={ns} text={ns} onCopy={onCopy} copied={copied} />
                ))}
              </>
            )}
            <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
              {/* The thing every reseller in this position actually needs:
                  something live to give the client today. */}
              Until it&apos;s ready, the site is already live at{" "}
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{slug}.sitebric.com</span> — you can
              hand that over now and it keeps working afterwards.
            </div>
          </div>
        )}

        {state === DOMAIN_STATES.LIVE && (
          <div style={{ marginTop: 8 }}>
            <a
              href={`https://${status.domain}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 12,
                color: "#fff",
              }}
            >
              Open {status.domain} →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
