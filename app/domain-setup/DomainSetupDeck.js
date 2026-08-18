"use client";

import { useCallback, useEffect, useState } from "react";
import { t } from "@/lib/theme";

// The nameservers a connected domain has to point at. Same pair the
// dashboard shows once a domain is connected — if that ever changes, both
// places have to change together.
const NAMESERVERS = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

// Written for resellers handing a finished site to a client, most of whom
// have never touched DNS. Two things account for nearly every support
// question and both are called out rather than buried: Sitebric delegates
// nameservers where most hosts take an A record, and switching
// nameservers carries the client's email with it.
const SLIDES = [
  {
    eyebrow: "Guide",
    lead: true,
    title: "Putting a client's site on their own domain.",
    lede: (
      <>
        Four steps, about five minutes of work, then some waiting. The part that trips almost
        everyone up is step 3 — it is <strong>not</strong> the A record you have seen in other
        tutorials.
      </>
    ),
    cards: [
      {
        h: "What you end up with",
        p: (
          <>
            The client&apos;s site loads at <code className="sb-ds-inline">theirbusiness.com</code>{" "}
            with a padlock, and nothing on the page mentions Sitebric. The certificate is issued for
            you — you never touch SSL.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Before you start",
    title: "Two things have to be true.",
    checks: [
      {
        n: "1",
        body: (
          <>
            <strong>The site is finished and published.</strong> The domain box does not appear until
            a site is published — if you cannot find it, this is why.
          </>
        ),
      },
      {
        n: "2",
        body: (
          <>
            <strong>Somebody already owns the domain.</strong> You or the client bought it from a
            registrar — Namecheap, GoDaddy, Google Domains. Sitebric does not sell domains.
          </>
        ),
      },
    ],
    after: (
      <>
        You need the <strong>login for wherever the domain was bought</strong>. If the client bought
        it, you will need them on the phone or their account details. This is the single most common
        reason a handoff stalls for a week — sort it out before you start.
      </>
    ),
  },
  {
    eyebrow: "Step 1 of 4 · In Sitebric",
    step: 1,
    title: "Publish the site.",
    lede: (
      <>
        Open the site in your dashboard and hit <strong>Publish</strong>. Until you do, the domain
        field is not on screen at all.
      </>
    ),
    cards: [
      {
        h: "Why it works this way",
        p: "A domain points at a live site. There is nothing to point at until the site is published, so the field stays hidden rather than letting you connect a domain to a blank page.",
      },
    ],
  },
  {
    eyebrow: "Step 2 of 4 · In Sitebric",
    step: 2,
    title: "Type the domain, press Connect.",
    lede: (
      <>
        A field appears under the published site. Enter the domain and click{" "}
        <strong>Connect domain</strong>.
      </>
    ),
    code: ["theirbusiness.com"],
    row: [
      { h: "Exactly like that", p: "Nothing before it, nothing after it. Just the domain." },
      {
        h: "Not like this",
        p: (
          <>
            <code className="sb-ds-inline">https://theirbusiness.com</code>,{" "}
            <code className="sb-ds-inline">www.theirbusiness.com</code>, or a trailing slash. Any of
            those will fail.
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Step 3 of 4 · At the registrar",
    step: 3,
    title: "Change the nameservers.",
    lede: (
      <>
        Log in where the domain was bought. Find <strong>Nameservers</strong> — usually under DNS, or
        &quot;Domain settings&quot;. Switch it from &quot;Default&quot; or &quot;Basic DNS&quot; to{" "}
        <strong>Custom</strong>, and enter these two:
      </>
    ),
    code: NAMESERVERS,
    warn: {
      h: "Read this if you have watched a YouTube tutorial",
      p: (
        <>
          You are <strong>not</strong> adding an A record. You are <strong>not</strong> adding a
          CNAME. Most guides online describe those because most hosts work that way — Sitebric does
          not. If you add an A record and leave the nameservers alone, nothing will ever happen.
        </>
      ),
    },
  },
  {
    eyebrow: "Step 4 of 4 · Waiting",
    step: 4,
    title: "Now leave it alone.",
    lede: (
      <>
        Nameserver changes take <strong>a few minutes to a few hours</strong> to spread across the
        internet. There is no button that speeds this up.
      </>
    ),
    row: [
      {
        h: "What happens on its own",
        p: "The domain starts serving the site, and the SSL certificate is issued automatically. The padlock appears without you doing anything.",
      },
      {
        h: "While you wait",
        p: "You may see a “this domain isn’t connected” page, or the registrar’s parking page. Both are normal mid-change. Check again in an hour.",
      },
    ],
    after: (
      <>
        Still nothing after <strong>24 hours</strong>? Something is genuinely wrong — go back and
        check the nameservers actually saved. Many registrars silently discard the change if you
        forget to hit Save on that specific panel.
      </>
    ),
  },
  {
    eyebrow: "Important · not a step",
    title: "If the client uses email on that domain, stop.",
    warn: {
      h: "This one actually breaks things",
      p: (
        <>
          Changing nameservers moves <strong>all</strong> of that domain&apos;s DNS, not just the
          website. If the client has email at that address —{" "}
          <code className="sb-ds-inline">mike@theirbusiness.com</code> through Google Workspace,
          Microsoft 365, or their registrar — <strong>their email will stop arriving</strong> the
          moment the change takes effect.
        </>
      ),
    },
    after: (
      <>
        It is fixable: their mail records (MX, and usually SPF and DKIM) have to be recreated on the
        new nameservers. But find out <strong>before</strong> you switch, not after a plumber calls
        you because he has stopped receiving quotes.
        <br />
        <br />
        <strong>Always ask: &ldquo;do you use email on this domain?&rdquo;</strong> If the answer is
        yes, get their current DNS records written down first.
      </>
    ),
  },
  {
    eyebrow: "Troubleshooting",
    title: "Why it usually isn't working.",
    mistakes: [
      {
        b: "The site was never published",
        fix: "No published site means no domain field. Publish first, then look again.",
      },
      {
        b: "An A record was added instead of nameservers",
        fix: "The most common one by far. Delete it and change the nameservers instead.",
      },
      {
        b: "The domain was typed with https:// or www",
        fix: "Enter the bare domain only.",
      },
      {
        b: "Nameservers were entered but never saved",
        fix: "Log back in and confirm they are still showing. Registrars lose this constantly.",
      },
      {
        b: "It has been eleven minutes",
        fix: "Not a problem yet. Give it a few hours before troubleshooting anything.",
      },
    ],
  },
  {
    eyebrow: "Quick reference",
    title: "The whole thing, in one card.",
    recap: true,
    code: NAMESERVERS,
  },
];

export default function DomainSetupDeck() {
  const [i, setI] = useState(0);
  const last = SLIDES.length - 1;

  const go = useCallback(
    (n) => {
      setI((cur) => {
        const next = Math.max(0, Math.min(last, typeof n === "function" ? n(cur) : n));
        if (next !== cur && typeof window !== "undefined") window.scrollTo(0, 0);
        return next;
      });
    },
    [last]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === "PageDown") go((c) => c + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go((c) => c - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, last]);

  return (
    <div className="sb-ds">
      {/* React escapes the text child of a <style> tag, which breaks the
          server render and silently drops the page to client-only. This
          has shipped three times in this codebase; it goes in through
          dangerouslySetInnerHTML for that reason. */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sb-ds-rail">
        <div className="sb-ds-brand">
          Sitebric <span>/ Connecting a domain</span>
        </div>
        <nav className="sb-ds-dots" aria-label="Go to slide">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              type="button"
              className="sb-ds-dot"
              aria-label={`Slide ${n + 1}`}
              aria-current={n === i ? "true" : "false"}
              onClick={() => go(n)}
            />
          ))}
        </nav>
      </div>

      <main className="sb-ds-stage">
        {SLIDES.map((s, n) => (
        <section
          className={`sb-ds-slide${n === i ? " is-active" : ""}`}
          key={n}
          aria-hidden={n === i ? undefined : "true"}
        >
          <p className={`sb-ds-eyebrow${s.step ? " sb-ds-eyebrow-step" : ""}`}>{s.eyebrow}</p>

          {s.lead ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}

          {s.lede && <p className="sb-ds-lede">{s.lede}</p>}

          {s.checks && (
            <ul className="sb-ds-checks">
              {s.checks.map((c) => (
                <li key={c.n}>
                  <span className="sb-ds-mark">{c.n}</span>
                  <span>{c.body}</span>
                </li>
              ))}
            </ul>
          )}

          {s.code && (
            <div className="sb-ds-code">
              {s.code.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          )}

          {s.row && (
            <div className="sb-ds-row">
              {s.row.map((c) => (
                <div className="sb-ds-card" key={c.h}>
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          )}

          {s.cards &&
            s.cards.map((c) => (
              <div className="sb-ds-card" key={c.h}>
                <h3>{c.h}</h3>
                <p>{c.p}</p>
              </div>
            ))}

          {s.warn && (
            <div className="sb-ds-warn">
              <p className="sb-ds-eyebrow">{s.warn.h}</p>
              <p>{s.warn.p}</p>
            </div>
          )}

          {s.mistakes && (
            <div className="sb-ds-card sb-ds-card-flush">
              {s.mistakes.map((m) => (
                <div className="sb-ds-mistake" key={m.b}>
                  <span className="sb-ds-x">&times;</span>
                  <span>
                    <b>{m.b}</b>
                    <span className="sb-ds-fix">{m.fix}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {s.recap && (
            <>
              <div className="sb-ds-card">
                <h3>Steps</h3>
                <p className="sb-ds-recap">
                  <strong>1.</strong> Publish the site in Sitebric.
                  <br />
                  <strong>2.</strong> Enter the bare domain, click Connect domain.
                  <br />
                  <strong>3.</strong> At the registrar, set nameservers to the two below.
                  <br />
                  <strong>4.</strong> Wait. Minutes to hours. SSL is automatic.
                </p>
              </div>
            </>
          )}

          {s.after && <p className="sb-ds-after">{s.after}</p>}

          {s.recap && (
            <p className="sb-ds-after">
              <span className="sb-ds-good">&#10003;</span> Ask about email on the domain{" "}
              <em>before</em> switching.
              <br />
              <span className="sb-ds-good">&#10003;</span> Bare domain only — no{" "}
              <code className="sb-ds-inline">https://</code>, no{" "}
              <code className="sb-ds-inline">www</code>.
              <br />
              <span className="sb-ds-good">&#10003;</span> Nameservers, never an A record.
            </p>
          )}
        </section>
        ))}
      </main>

      <div className="sb-ds-foot">
        <button type="button" className="sb-ds-btn" onClick={() => go(i - 1)} disabled={i === 0}>
          &larr; Back
        </button>
        <button type="button" className="sb-ds-btn" onClick={() => go(i + 1)} disabled={i === last}>
          Next &rarr;
        </button>
        <span className="sb-ds-hint">or use the arrow keys</span>
        <span className="sb-ds-counter">
          {i + 1} / {SLIDES.length}
        </span>
      </div>
    </div>
  );
}

// Scoped under .sb-ds so nothing here can reach the rest of the app.
const CSS = `
.sb-ds {
  --ds-warn: #FBBF24;
  --ds-warn-bg: rgba(251,191,36,0.08);
  --ds-warn-line: rgba(251,191,36,0.28);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${t.bg};
  color: ${t.text};
}
.sb-ds * { box-sizing: border-box; }
.sb-ds-rail {
  position: sticky; top: 0; z-index: 10;
  background: ${t.bg};
  border-bottom: 1px solid ${t.border};
  display: flex; align-items: center; gap: 20px;
  padding: 14px clamp(16px, 4vw, 40px);
}
.sb-ds-brand { font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; }
.sb-ds-brand span { color: ${t.textFaint}; font-weight: 500; }
.sb-ds-dots { display: flex; gap: 7px; margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
.sb-ds-dot {
  width: 22px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.13);
  border: none; padding: 0; cursor: pointer;
  transition: background 0.2s ${t.ease};
}
.sb-ds-dot:hover { background: rgba(255,255,255,0.3); }
.sb-ds-dot[aria-current="true"] { background: ${t.text}; }
.sb-ds-dot:focus-visible { outline: 2px solid ${t.text}; outline-offset: 3px; }
.sb-ds-stage {
  flex: 1; display: flex; justify-content: center;
  padding: clamp(28px, 6vh, 68px) clamp(16px, 4vw, 40px) 40px;
}
.sb-ds-slide { width: 100%; max-width: 900px; display: none; animation: sbDsRise 0.32s ${t.ease} both; }
.sb-ds-slide.is-active { display: block; }
@keyframes sbDsRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .sb-ds-slide { animation: none; }
  .sb-ds * { transition: none !important; }
}
.sb-ds-eyebrow {
  font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em;
  text-transform: uppercase; color: ${t.textFaint}; margin: 0 0 18px;
}
.sb-ds-eyebrow-step { color: ${t.textMuted}; }
.sb-ds h1 {
  font-size: clamp(30px, 5.4vw, 54px); font-weight: 600;
  letter-spacing: -0.035em; line-height: 1.05; margin: 0 0 20px; text-wrap: balance;
}
.sb-ds h2 {
  font-size: clamp(24px, 3.8vw, 38px); font-weight: 600;
  letter-spacing: -0.03em; line-height: 1.12; margin: 0 0 18px; text-wrap: balance;
}
.sb-ds-lede {
  font-size: clamp(15.5px, 2vw, 18px); line-height: 1.65;
  color: ${t.textMuted}; max-width: 62ch; margin: 0 0 28px;
}
.sb-ds p { line-height: 1.65; color: ${t.textMuted}; }
.sb-ds strong { color: ${t.text}; font-weight: 600; }
.sb-ds-after { margin: 22px 0 0; }
.sb-ds-card {
  background: linear-gradient(180deg, ${t.bgCardTop} 0%, ${t.bgCard} 100%);
  border: 1px solid ${t.border};
  border-radius: 14px;
  padding: clamp(18px, 3vw, 26px);
  margin-top: 18px;
}
.sb-ds-card-flush { padding-top: 4px; padding-bottom: 4px; }
.sb-ds-card h3 { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 8px; color: ${t.text}; }
.sb-ds-card p { margin: 0; font-size: 14.5px; }
.sb-ds-recap { line-height: 1.9 !important; }
.sb-ds-row { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; }
.sb-ds-row .sb-ds-card { margin-top: 0; }
@media (min-width: 720px) {
  .sb-ds-row { flex-direction: row; }
  .sb-ds-row > * { flex: 1; }
}
.sb-ds-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(14px, 2.4vw, 19px); font-weight: 500; color: ${t.text};
  background: rgba(0,0,0,0.55);
  border: 1px solid ${t.borderHover};
  border-radius: 10px; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 8px;
  overflow-x: auto; user-select: all; margin-top: 18px;
}
.sb-ds-inline {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em; color: ${t.text};
  background: rgba(255,255,255,0.07); border-radius: 5px; padding: 2px 6px;
}
.sb-ds-warn {
  background: var(--ds-warn-bg);
  border: 1px solid var(--ds-warn-line);
  border-radius: 14px; padding: clamp(18px, 3vw, 26px); margin-top: 20px;
}
.sb-ds-warn .sb-ds-eyebrow { color: var(--ds-warn); }
.sb-ds-warn p { color: rgba(255,255,255,0.78); margin: 0; }
.sb-ds-good { color: ${t.positive}; }
.sb-ds-checks { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.sb-ds-checks li { display: flex; gap: 12px; align-items: flex-start; font-size: 15.5px; line-height: 1.55; color: ${t.textMuted}; }
.sb-ds-mark { flex: none; width: 18px; color: ${t.positive}; font-weight: 600; }
.sb-ds-mistake { display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid ${t.border}; }
.sb-ds-mistake:last-child { border-bottom: none; }
.sb-ds-x { flex: none; color: ${t.negative}; font-weight: 600; font-size: 15px; line-height: 1.5; }
.sb-ds-mistake b { display: block; color: ${t.text}; font-weight: 600; font-size: 15px; margin-bottom: 3px; }
.sb-ds-fix { font-size: 14.5px; color: ${t.textMuted}; line-height: 1.55; display: block; }
.sb-ds-foot {
  position: sticky; bottom: 0; background: ${t.bg};
  border-top: 1px solid ${t.border};
  display: flex; align-items: center; gap: 12px;
  padding: 12px clamp(16px, 4vw, 40px);
}
.sb-ds-btn {
  font: inherit; font-size: 13.5px; font-weight: 500; color: ${t.text};
  background: rgba(255,255,255,0.06);
  border: 1px solid ${t.borderHover};
  border-radius: 9px; padding: 9px 18px; cursor: pointer;
  transition: background 0.18s ${t.ease};
}
.sb-ds-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.sb-ds-btn:disabled { opacity: 0.32; cursor: default; }
.sb-ds-btn:focus-visible { outline: 2px solid ${t.text}; outline-offset: 2px; }
.sb-ds-counter { margin-left: auto; font-size: 12.5px; color: ${t.textFaint}; font-variant-numeric: tabular-nums; }
.sb-ds-hint { font-size: 12.5px; color: rgba(255,255,255,0.3); }
@media (max-width: 640px) { .sb-ds-hint { display: none; } }
`;
