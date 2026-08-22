"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_BUSINESS, DEMO_PROMPTS, demoGreeting } from "@/lib/demo-chat";

// Talking to the receptionist in a browser.
//
// Speech in and speech out both happen on the device — the Web Speech
// APIs — and the only thing that reaches our server is the transcript of
// what was said. That keeps this cheap enough to leave open to the public
// and means no audio ever leaves the visitor's machine.
//
// The cost: SpeechRecognition does not exist in Firefox. Rather than tell
// those visitors to come back in another browser, the same conversation
// runs from a text box there. The demo still demonstrates the thing being
// sold, which is what the assistant SAYS.
//
// Monochrome, like the rest of the product. The reference for this screen
// was electric blue; the orb keeps the shape and the light and drops the
// colour, because a demo that looks like a different product than the
// dashboard makes the dashboard look like the cheap one.

const STATES = {
  idle: "Tap to talk",
  listening: "Listening…",
  thinking: "…",
  speaking: "",
};

export default function OrbDemo({ autoFocus = false }) {
  const [state, setState] = useState("idle");
  const [history, setHistory] = useState([]);
  const [caption, setCaption] = useState(demoGreeting());
  const [supported, setSupported] = useState(null);
  const [typed, setTyped] = useState("");
  const [ended, setEnded] = useState(false);

  const recognition = useRef(null);
  const historyRef = useRef([]);
  historyRef.current = history;

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSupported(Boolean(SR));
  }, []);

  const speak = useCallback((text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onend = () => setState("idle");
    setState("speaking");
    window.speechSynthesis.speak(u);
  }, []);

  const send = useCallback(
    async (said) => {
      if (!said || ended) return;
      setState("thinking");
      setCaption("");
      const next = [...historyRef.current, { role: "user", text: said }];
      setHistory(next);

      try {
        const res = await fetch("/api/demo-receptionist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ said, history: historyRef.current }),
        });
        const data = await res.json();
        const reply = String(data.reply || "Sorry, could you say that again?");
        setHistory([...next, { role: "assistant", text: reply }]);
        setCaption(reply);
        if (data.done) setEnded(true);
        speak(reply);
      } catch {
        setCaption("Sorry — something went wrong there. Try again?");
        setState("idle");
      }
    },
    [ended, speak]
  );

  const listen = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || ended) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    recognition.current = r;

    let final = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      // Shown as they speak, so the orb is visibly reacting rather than
      // sitting there while the browser thinks.
      setCaption(final || interim);
    };
    r.onerror = () => setState("idle");
    r.onend = () => {
      if (final.trim()) send(final.trim());
      else setState("idle");
    };

    setState("listening");
    setCaption("");
    try {
      r.start();
    } catch {
      setState("idle");
    }
  }, [ended, send]);

  function stop() {
    try {
      recognition.current?.stop();
    } catch {
      /* already stopped */
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }

  const busy = state === "thinking" || state === "speaking";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>
      {/* React escapes the text child of a <style> tag, so server and
          client markup disagree and the whole page silently falls back to
          client rendering. This repo has shipped that three times. */}
      <style dangerouslySetInnerHTML={{ __html: ORB_CSS }} />

      <div className={`sb-orb sb-orb--${state}`} aria-hidden="true">
        <span className="sb-orb__ring sb-orb__ring--outer" />
        <span className="sb-orb__ring sb-orb__ring--mid" />
        <span className="sb-orb__core" />
      </div>

      <button
        onClick={state === "listening" ? stop : listen}
        disabled={ended || busy || supported === false}
        autoFocus={autoFocus}
        style={{
          background: state === "listening" ? "rgba(255,255,255,0.12)" : "#fff",
          color: state === "listening" ? "#fff" : "#0A0A10",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 999,
          padding: "13px 30px",
          fontWeight: 700,
          fontSize: 14,
          cursor: ended || busy ? "default" : "pointer",
          opacity: ended || busy ? 0.55 : 1,
          minWidth: 190,
        }}
      >
        {ended ? "Demo finished" : STATES[state] || "…"}
      </button>

      {/* aria-live so a screen-reader user gets the reply too — this is
          the one screen where all the content arrives as sound. */}
      <p
        aria-live="polite"
        style={{
          minHeight: 58,
          margin: 0,
          maxWidth: 620,
          textAlign: "center",
          fontSize: 17,
          lineHeight: 1.55,
          color: caption ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.4)",
        }}
      >
        {caption || (state === "listening" ? "Go ahead…" : "")}
      </p>

      {supported === false && (
        <div style={{ width: "100%", maxWidth: 520 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 0 }}>
            This browser can&apos;t do speech recognition — Firefox doesn&apos;t have it. Type
            instead, and it&apos;ll still answer out loud.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const said = typed.trim();
              setTyped("");
              send(said);
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="How much is a call-out?"
              aria-label="Say something to the receptionist"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "11px 14px",
                color: "#fff",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={ended || !typed.trim()}
              style={{
                background: "#fff",
                color: "#0A0A10",
                border: "none",
                borderRadius: 10,
                padding: "11px 20px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 640 }}>
        {DEMO_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={ended || busy}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 999,
              padding: "8px 15px",
              color: "rgba(255,255,255,0.8)",
              fontSize: 12.5,
              cursor: ended || busy ? "default" : "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)", textAlign: "center", margin: 0, maxWidth: 560 }}>
        It&apos;s answering as <strong style={{ color: "rgba(255,255,255,0.7)" }}>{DEMO_BUSINESS}</strong>,
        a made-up locksmith. Ask it something it wasn&apos;t told — it won&apos;t guess.
      </p>
    </div>
  );
}

// Motion is gated on prefers-reduced-motion, as everywhere else in this
// product. A frozen orb usually means the viewer has Reduce Motion on.
const ORB_CSS = `
.sb-orb {
  position: relative;
  width: min(56vw, 260px);
  height: min(56vw, 260px);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.sb-orb__core {
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #ffffff 0%, rgba(255,255,255,0.85) 18%, rgba(190,205,225,0.5) 42%, rgba(60,70,90,0.25) 70%, rgba(10,10,16,0) 100%);
  box-shadow: 0 0 70px 12px rgba(200,215,240,0.28), inset 0 0 40px rgba(255,255,255,0.4);
  transition: transform 320ms ease, box-shadow 320ms ease;
}
.sb-orb__ring { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.16); }
.sb-orb__ring--outer { inset: 0; border-style: dashed; opacity: 0.5; }
.sb-orb__ring--mid { inset: 11%; border-color: rgba(255,255,255,0.24); }
.sb-orb--listening .sb-orb__core {
  transform: scale(1.06);
  box-shadow: 0 0 96px 18px rgba(210,225,255,0.42), inset 0 0 46px rgba(255,255,255,0.55);
}
.sb-orb--thinking .sb-orb__core { transform: scale(0.95); }
.sb-orb--speaking .sb-orb__core {
  box-shadow: 0 0 86px 16px rgba(200,215,240,0.36), inset 0 0 44px rgba(255,255,255,0.5);
}
@media (prefers-reduced-motion: no-preference) {
  .sb-orb__ring--outer { animation: sb-orb-spin 26s linear infinite; }
  .sb-orb__ring--mid { animation: sb-orb-spin 17s linear infinite reverse; }
  .sb-orb--listening .sb-orb__core { animation: sb-orb-pulse 1.6s ease-in-out infinite; }
  .sb-orb--thinking .sb-orb__ring--mid { animation: sb-orb-spin 2.4s linear infinite; }
  .sb-orb--speaking .sb-orb__core { animation: sb-orb-pulse 2.4s ease-in-out infinite; }
}
@keyframes sb-orb-spin { to { transform: rotate(360deg); } }
@keyframes sb-orb-pulse {
  0%, 100% { transform: scale(1.03); }
  50% { transform: scale(1.09); }
}
`;
