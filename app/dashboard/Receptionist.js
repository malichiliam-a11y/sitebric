"use client";

import { useState } from "react";

// The receptionist tab: a number that answers, what it's allowed to say,
// and every call it took.
//
// Its own file so it can be rendered in a browser without a login — the
// rest of the dashboard needs a Supabase session before it draws a pixel,
// and this is the most complicated screen in the product to get wrong
// quietly.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

const panel = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "18px 20px",
};

const input = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#fff",
  fontFamily: BODY,
  fontSize: 13,
  boxSizing: "border-box",
};

// Placeholders on a dark ground read as filled-in values. The first
// person to use this screen — the owner — typed nothing, pressed Find
// numbers, got numbers from four states he had never heard of, and asked
// what to do next: the example business name and area code sitting in the
// boxes looked exactly like text he had entered. The browser default is
// nowhere near dim enough here, so it is set explicitly.
const PLACEHOLDER_CSS = `
  .sb-rx input::placeholder,
  .sb-rx textarea::placeholder {
    color: rgba(255,255,255,0.34);
    opacity: 1;
  }
`;

const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "rgba(255,255,255,0.82)",
  marginBottom: 5,
};

const hint = { fontSize: 12.5, color: "rgba(255,255,255,0.74)", lineHeight: 1.5, marginTop: 4 };

// A number as a person reads it, not as it is dialled.
export function prettyNumber(e164) {
  const raw = String(e164 || "");
  const m = raw.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : raw;
}

export function minutesBar(used, limit) {
  const cap = Number(limit) || 1;
  return Math.max(0, Math.min(100, (Number(used) / cap) * 100));
}

function Urgency({ level }) {
  if (level !== "urgent") return null;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        padding: "2px 7px",
        borderRadius: 999,
        color: "#0A0A10",
        background: "#FCA5A5",
        whiteSpace: "nowrap",
      }}
    >
      URGENT
    </span>
  );
}

export function CallRow({ call, onOpen }) {
  const when = call.created_at ? new Date(call.created_at) : null;
  return (
    <div
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        fontFamily: BODY,
      }}
    >
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#fff",
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            {call.caller_name || prettyNumber(call.callback_number) || "Unknown caller"}
          </button>
          <Urgency level={call.urgency} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", marginTop: 2 }}>
          {call.summary || "No details taken."}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
        {when ? when.toLocaleString() : ""}
        {call.seconds ? ` · ${Math.round(call.seconds)}s` : ""}
      </div>
    </div>
  );
}



// "Ring it yourself" — the whole point of which is that it works before
// anyone has paid for anything.
//
// Hearing this product used to require a Growth plan AND buying a number.
// Nobody buys a subscription for a feature they have never heard, so the
// people most in need of convincing were the only ones who could not be.
// This block is shown to everyone, on every plan, including accounts that
// cannot use the feature at all.
function TryIt({ demo }) {
  if (!demo?.phoneNumber) return null;
  const dial = String(demo.phoneNumber).replace(/[^0-9+]/g, "");

  return (
    <div
      style={{
        ...panel,
        marginBottom: 16,
        maxWidth: 720,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    >
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            Hear it before you sell it
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.66)" }}>
            Ring this number and talk to it. It&apos;s set up as {demo.businessName || "a demo business"} —
            ask for a quote, ask something it wasn&apos;t told, see how it handles you. Free, and you
            don&apos;t need a plan.
          </div>
        </div>
        <a
          href={`tel:${dial}`}
          style={{
            background: "#fff",
            color: "#0A0A10",
            borderRadius: 10,
            padding: "12px 20px",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {prettyNumber(demo.phoneNumber)}
        </a>
      </div>
      <div style={{ ...hint, marginTop: 10 }}>
        Three calls a day per phone, so one person can&apos;t use up everybody else&apos;s.
      </div>
    </div>
  );
}

// How the whole thing works, in the order it happens.
//
// The owner built this feature, paid for the Twilio account, and still
// asked "do I need to buy a phone number? how does it even work?" — which
// means nobody arriving cold had a chance. The screen said what to type,
// never what the thing IS.
//
// The part that confuses everyone: this is a NEW number. A business's
// existing line cannot be pointed at an AI directly. Either their old
// number forwards to this one, or this one becomes the number they hand
// out. Nothing else works, and nothing on this page used to say so.
function HowItWorks({ hasNumber }) {
  const steps = [
    {
      n: 1,
      title: "You get a number here",
      body: "A brand new phone line, about $1.15 a month. One per client. That's the whole cost to you — you charge them whatever you like on top.",
    },
    {
      n: 2,
      title: "Their old number forwards to it",
      body: "Your client rings their phone company and sets call forwarding to this number — usually only when they don't pick up. Their customers keep dialling the same number they always have. Nothing about their line changes.",
    },
    {
      n: 3,
      title: "It answers when they can't",
      body: "Takes the caller's name, number and what they need, then texts you and shows it here. If it's a real emergency, it puts the caller straight through to your client's mobile instead.",
    },
  ];

  return (
    <div style={{ ...panel, marginBottom: 16, maxWidth: 720 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
        {hasNumber ? "How this works" : "How this works — read this first"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {steps.map((s) => (
          <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {s.n}
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.66)" }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        This is a <strong style={{ color: "#fff" }}>new</strong> number, not their existing one. An
        AI can&apos;t be attached to a line someone already owns — either their number forwards to
        this one, or they start handing this one out.
      </div>
    </div>
  );
}

// What the reseller sends the client once the number exists. Without this
// they have a working number and no idea what to tell anyone.
function HandOver({ number, onCopy, copied }) {
  const text = `Here's your new answering line: ${prettyNumber(number.phone_number)}

To switch it on, call your phone provider (or use your phone's settings) and set up CALL FORWARDING WHEN UNANSWERED to ${prettyNumber(number.phone_number)}.

Nothing else changes. Customers keep calling your normal number. If you don't pick up within a few rings, it rolls over here and gets answered instead of going to voicemail. You get the caller's name, number and what they need sent to you straight away, and anything urgent gets put through to your mobile.`;

  return (
    <div style={{ ...panel, marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15 }}>
          Send this to your client
        </div>
        <button
          type="button"
          onClick={() => onCopy(text)}
          style={{
            background: copied ? "rgba(74,222,128,0.14)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 8,
            padding: "7px 14px",
            color: copied ? "#4ADE80" : "#fff",
            fontFamily: BODY,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.78)",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function Receptionist({
  numbers = [],
  calls = [],
  demo = null,
  isOwnerAccount = false,
  available = true,
  canUse = true,
  onSearch,
  onBuy,
  onSave,
  onDelete,
  onUpgrade,
  busy = false,
  error = "",
}) {
  const [areaCode, setAreaCode] = useState("");
  const [found, setFound] = useState(null);
  const [draft, setDraft] = useState({ businessName: "", forwardTo: "", businessFacts: "" });
  const [editing, setEditing] = useState(null);
  const [openCall, setOpenCall] = useState(null);
  const [copied, setCopied] = useState(false);

  async function copyHandover(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard blocked; the text is on screen to select by hand. */
    }
  }

  const number = numbers[0] || null;

  if (!canUse) {
    return (
      <div className="sb-rx" style={{ fontFamily: BODY, color: "#fff" }}>
        <style dangerouslySetInnerHTML={{ __html: PLACEHOLDER_CSS }} />
        {/* Shown first, deliberately. Someone who cannot use the feature
            is exactly who needs to hear it working. */}
        <TryIt demo={demo} />
        <div style={{ ...panel, maxWidth: 620 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
          Give a client a number that answers
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,0.74)", margin: "0 0 14px" }}>
          A website is a one-time sale. A receptionist is every month. It picks up when they
          can&apos;t, takes the caller&apos;s name, number and what they need, and puts real
          emergencies straight through to their mobile.
        </p>
        <p style={{ ...hint, marginBottom: 16 }}>
          On Growth and Pro — every number costs us monthly whether it rings or not, so it
          isn&apos;t something a trial can carry.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            background: "#fff",
            color: "#0A0A10",
            border: "none",
            borderRadius: 10,
            padding: "11px 20px",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          See plans →
        </button>
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div style={{ ...panel, fontFamily: BODY, color: "#fff", maxWidth: 620 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>
          Almost ready
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,0.74)", margin: 0 }}>
          Phone numbers aren&apos;t switched on yet. Everything else here is built and waiting —
          this turns on the moment the telephony account is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="sb-rx" style={{ fontFamily: BODY, color: "#fff" }}>
      {/* React escapes the text child of a <style> tag, so server and
          client markup disagree and the whole page silently falls back to
          client rendering. This repo has shipped that bug three times. */}
      <style dangerouslySetInnerHTML={{ __html: PLACEHOLDER_CSS }} />
      {error && (
        <div style={{ fontSize: 12.5, color: "#FCA5A5", marginBottom: 14 }}>{error}</div>
      )}

      <TryIt demo={demo} />

      <HowItWorks hasNumber={Boolean(number)} />

      {number && <HandOver number={number} onCopy={copyHandover} copied={copied} />}

      {!number && (
        <div style={{ ...panel, marginBottom: 16, maxWidth: 620 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
            Get a number
          </div>
          <p style={{ ...hint, marginTop: 0, marginBottom: 16 }}>
            Pick the area code your client&apos;s customers are used to seeing. Nothing is charged
            until you press Use this one.
          </p>

          <div style={{ marginBottom: 12 }}>
            <span style={label}>Business name</span>
            <input
              style={{
                ...input,
                // A required box that is empty should look unfinished
                // rather than look like every other box.
                borderColor: draft.businessName.trim()
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.3)",
              }}
              value={draft.businessName}
              placeholder="e.g. Northgate Locksmiths"
              onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
            />
            <div style={hint}>
              {draft.businessName.trim()
                ? "Said in the greeting, exactly as typed."
                : "Required — this is what callers hear when it answers."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}>
              <span style={label}>Area code (optional)</span>
              <input
                style={input}
                value={areaCode}
                placeholder="e.g. 512"
                inputMode="numeric"
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
            </div>
            <button
              disabled={busy}
              onClick={async () => setFound(await onSearch(areaCode))}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontFamily: BODY,
                fontWeight: 600,
                fontSize: 13,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "Looking…" : "Find numbers"}
            </button>
          </div>

          {found && found.length === 0 && (
            <div style={hint}>Nothing free in that area code — try another, or leave it blank.</div>
          )}

          {found && found.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {found.map((n) => (
                <div
                  key={n.phoneNumber}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {prettyNumber(n.phoneNumber)}
                    <span style={{ color: "rgba(255,255,255,0.74)", fontWeight: 400 }}>
                      {n.locality ? ` · ${n.locality}` : ""}
                      {n.region ? `, ${n.region}` : ""}
                    </span>
                  </span>
                  <button
                    disabled={busy || !draft.businessName.trim()}
                    onClick={() => onBuy({ ...draft, phoneNumber: n.phoneNumber })}
                    style={{
                      background: draft.businessName.trim() ? "#fff" : "rgba(255,255,255,0.1)",
                      color: draft.businessName.trim() ? "#0A0A10" : "rgba(255,255,255,0.74)",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: draft.businessName.trim() ? "pointer" : "default",
                    }}
                  >
                    Use this one
                  </button>
                </div>
              ))}
              {!draft.businessName.trim() && (
                <div style={hint}>Add the business name first — the greeting needs it.</div>
              )}
            </div>
          )}
        </div>
      )}

      {number && (
        <>
          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
                  {prettyNumber(number.phone_number)}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.64)", marginTop: 3 }}>
                  Answering for {number.business_name} · forward their line here
                </div>
              </div>
              <button
                onClick={() => onDelete(number.id)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: BODY,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                Give it back
              </button>
            </div>

            {/* The spend ceiling, shown before it is hit rather than after. */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>Minutes this month</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(number.minutes_used)} / {number.minutes_limit}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${minutesBar(number.minutes_used, number.minutes_limit)}%`,
                    borderRadius: 3,
                    background:
                      minutesBar(number.minutes_used, number.minutes_limit) > 85 ? "#FCA5A5" : "#fff",
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              What it&apos;s allowed to say
            </div>

            <div style={{ marginBottom: 14 }}>
              <span style={label}>Your client&apos;s mobile — for emergencies</span>
              <input
                style={input}
                defaultValue={number.forward_to}
                placeholder="+1 512 555 9999"
                onChange={(e) => setEditing({ ...editing, forwardTo: e.target.value })}
              />
              <div style={hint}>
                Where a burst pipe gets put straight through to a human. This is your
                client&apos;s own phone, not the number above. Leave it empty and it will never
                offer to transfer anyone — better than promising a person who never picks up.
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <span style={label}>What it&apos;s allowed to tell callers</span>
              <textarea
                style={{ ...input, minHeight: 110, resize: "vertical", lineHeight: 1.55 }}
                defaultValue={number.business_facts}
                placeholder={"Open 8am-6pm Mon-Sat.\nEmergency call-outs 24/7.\nCall-out fee $89.\nWe don't do gas work."}
                onChange={(e) => setEditing({ ...editing, businessFacts: e.target.value })}
              />
              <div style={hint}>
                This is the only thing it can state as fact. Anything not written here, it says
                someone will confirm on the call back — it will never guess a price or a time.
              </div>
            </div>

            {isOwnerAccount && (
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={editing?.isDemo ?? number.is_demo}
                  onChange={(e) => setEditing({ ...editing, isDemo: e.target.checked })}
                  style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }}
                />
                <span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                    Use this as the public demo line
                  </span>
                  <span style={{ ...hint, marginTop: 2 }}>
                    Owner only. Shows this number to every Sitebric user so they can ring it and
                    hear the product before buying anything. Capped at three calls a day per
                    caller.
                  </span>
                </span>
              </label>
            )}

            <button
              disabled={busy || !editing}
              onClick={() => onSave({ id: number.id, ...editing })}
              style={{
                background: editing ? "#fff" : "rgba(255,255,255,0.08)",
                color: editing ? "#0A0A10" : "rgba(255,255,255,0.74)",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 13,
                cursor: editing ? "pointer" : "default",
              }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      <div style={panel}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Calls
        </div>
        {calls.length === 0 && (
          <div style={{ ...hint, marginTop: 8 }}>
            No calls yet. Every one that comes in shows up here with who rang, their number and what
            they wanted.
          </div>
        )}
        {calls.map((call) => (
          <CallRow key={call.id} call={call} onOpen={() => setOpenCall(call)} />
        ))}
      </div>

      {openCall && (
        <div
          onClick={() => setOpenCall(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(6,6,10,0.72)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "6vh 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Call transcript"
            style={{
              width: "min(560px, 100%)",
              background: "#0C0C12",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "20px 22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17 }}>
                  {openCall.caller_name || prettyNumber(openCall.callback_number) || "Unknown caller"}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.64)", marginTop: 3 }}>
                  {prettyNumber(openCall.callback_number) || "Number withheld"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                {openCall.callback_number && (
                  <a
                    href={`tel:${openCall.callback_number.replace(/[^0-9+]/g, "")}`}
                    style={{
                      background: "#fff",
                      color: "#0A0A10",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: 12.5,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Call back
                  </a>
                )}
                <button
                  onClick={() => setOpenCall(null)}
                  aria-label="Close"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    color: "#fff",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {openCall.summary && (
              <div
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  marginBottom: 16,
                }}
              >
                {openCall.summary}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Array.isArray(openCall.transcript) ? openCall.transcript : []).map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 62,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: t.role === "caller" ? "#4ADE80" : "rgba(255,255,255,0.7)",
                      paddingTop: 2,
                    }}
                  >
                    {t.role === "caller" ? "Caller" : "Us"}
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(255,255,255,0.85)" }}>
                    {t.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
