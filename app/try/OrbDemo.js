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

  // How loudly something is happening right now, 0..1. Drives the orb.
  const [level, setLevel] = useState(0);
  const audio = useRef({ ctx: null, stream: null, raf: null, timer: null });

  // Stops whatever is currently driving the orb and lets it settle.
  const quiet = useCallback(() => {
    const a = audio.current;
    if (a.raf) cancelAnimationFrame(a.raf);
    if (a.timer) clearInterval(a.timer);
    a.raf = null;
    a.timer = null;
    if (a.stream) {
      // Released rather than held open — a page keeping the microphone
      // live after it has stopped listening is the kind of thing that
      // ends up in a screenshot on the internet.
      a.stream.getTracks().forEach((t) => t.stop());
      a.stream = null;
    }
    if (a.ctx) {
      a.ctx.close().catch(() => {});
      a.ctx = null;
    }
    setLevel(0);
  }, []);

  // Reads the microphone and reports how loud it is.
  //
  // Entirely additive: if the browser refuses, or there is no AudioContext,
  // the orb falls back to its CSS animation and the conversation is
  // unaffected. Nothing here touches what gets sent to the server, and no
  // audio leaves the machine — only a number between 0 and 1 that moves a
  // div.
  const watchMic = useCallback(async () => {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      audio.current.ctx = ctx;
      audio.current.stream = stream;

      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        // Root mean square around the centre line — actual loudness,
        // rather than whichever sample happened to be read.
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        // Eased so a normal speaking voice fills most of the range
        // instead of sitting near zero.
        setLevel((prev) => prev * 0.6 + Math.min(1, rms * 6) * 0.4);
        audio.current.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* No microphone, or permission refused. The CSS animation covers it. */
    }
  }, []);

  // While it speaks there is no audio stream to measure — the browser
  // renders speech itself and does not hand it back. So the orb is driven
  // from a shaped wobble instead, which reads as talking rather than as a
  // metronome.
  const watchSpeech = useCallback(() => {
    const started = Date.now();
    audio.current.timer = setInterval(() => {
      const t = (Date.now() - started) / 1000;
      const wobble =
        0.55 +
        0.25 * Math.sin(t * 7.3) +
        0.12 * Math.sin(t * 13.1 + 1.4) +
        0.08 * Math.sin(t * 3.1 + 0.6);
      setLevel(Math.max(0.15, Math.min(1, wobble)));
    }, 60);
  }, []);

  useEffect(() => quiet, [quiet]);

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
    u.onend = () => {
      quiet();
      setState("idle");
    };
    setState("speaking");
    quiet();
    watchSpeech();
    window.speechSynthesis.speak(u);
  }, [quiet, watchSpeech]);

  const send = useCallback(
    async (said) => {
      if (!said || ended) return;
      setState("thinking");
      quiet();
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
    [ended, speak, quiet]
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
    r.onerror = () => {
      quiet();
      setState("idle");
    };
    r.onend = () => {
      quiet();
      if (final.trim()) send(final.trim());
      else setState("idle");
    };

    setState("listening");
    setCaption("");
    watchMic();
    try {
      r.start();
    } catch {
      quiet();
      setState("idle");
    }
  }, [ended, send, watchMic, quiet]);

  function stop() {
    try {
      recognition.current?.stop();
    } catch {
      /* already stopped */
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    quiet();
    setState("idle");
  }

  const busy = state === "thinking" || state === "speaking";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>
      {/* React escapes the text child of a <style> tag, so server and
          client markup disagree and the whole page silently falls back to
          client rendering. This repo has shipped that three times. */}
      <style dangerouslySetInnerHTML={{ __html: ORB_CSS }} />

      <div
        className={`sb-orb sb-orb--${state}`}
        aria-hidden="true"
        // A custom property rather than inline transforms on each layer:
        // one number crosses the React boundary per frame and the CSS
        // decides what moves, so a repaint does not rebuild the tree.
        style={{ "--level": level.toFixed(3) }}
      >
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

/* --level is written from JS every frame: real microphone loudness while
   listening, a shaped wobble while speaking. Everything below reads it,
   so one number moves the whole orb and React never re-renders for it.
   It defaults to 0, which is what makes the orb work at all if the
   microphone is refused. */
.sb-orb { --level: 0; }

/* Grows and brightens with the voice. The transition is short enough to
   feel immediate and long enough that a consonant does not make it
   flicker. */
.sb-orb--listening .sb-orb__core,
.sb-orb--speaking .sb-orb__core {
  transform: scale(calc(1.02 + (var(--level) * 0.16)));
  box-shadow:
    0 0 calc(70px + (var(--level) * 70px)) calc(12px + (var(--level) * 16px))
      rgba(210,225,255, calc(0.26 + (var(--level) * 0.34))),
    inset 0 0 calc(40px + (var(--level) * 18px)) rgba(255,255,255, calc(0.4 + (var(--level) * 0.35)));
  transition: transform 90ms linear, box-shadow 120ms linear;
}

/* The rings push outward on the loud parts, so the movement reads as
   something coming off the orb rather than the orb just inflating. */
.sb-orb--listening .sb-orb__ring--mid,
.sb-orb--speaking .sb-orb__ring--mid {
  transform: scale(calc(1 + (var(--level) * 0.09)));
  border-color: rgba(255,255,255, calc(0.24 + (var(--level) * 0.4)));
  transition: transform 130ms ease-out, border-color 130ms linear;
}
.sb-orb--listening .sb-orb__ring--outer,
.sb-orb--speaking .sb-orb__ring--outer {
  transform: scale(calc(1 + (var(--level) * 0.045)));
  opacity: calc(0.5 + (var(--level) * 0.45));
  transition: transform 180ms ease-out, opacity 180ms linear;
}

.sb-orb--thinking .sb-orb__core { transform: scale(0.95); }

@media (prefers-reduced-motion: no-preference) {
  .sb-orb__ring--outer { animation: sb-orb-spin 26s linear infinite; }
  .sb-orb__ring--mid { animation: sb-orb-spin 17s linear infinite reverse; }
  .sb-orb--thinking .sb-orb__ring--mid { animation: sb-orb-spin 2.4s linear infinite; }

  /* The fallback. If the microphone was refused --level stays 0 and the
     orb would sit dead still while somebody talks to it, which looks
     broken rather than restrained. This keeps it breathing underneath;
     the transform above wins whenever there is a real level to read. */
  .sb-orb--listening .sb-orb__core,
  .sb-orb--speaking .sb-orb__core {
    animation: sb-orb-breathe 2.2s ease-in-out infinite;
  }
}

@keyframes sb-orb-spin { to { transform: rotate(360deg); } }
@keyframes sb-orb-breathe {
  0%, 100% { scale: 1; }
  50% { scale: calc(1.035 + (var(--level) * 0.02)); }
}
`;
