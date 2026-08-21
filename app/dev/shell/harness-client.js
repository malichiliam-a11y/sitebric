"use client";

import { PageShell, PageGrid, Panel } from "../../dashboard/PageShell";

// Representative content: a couple of short panels, one form-shaped one,
// and one full-width. If the grid looks right with these it looks right
// with the real tabs.
export default function Harness() {
  return (
    <div id="harness" style={{ background: "#0A0A10", minHeight: "100vh", color: "#fff" }}>
      <PageShell
        title="Settings"
        subtitle="Account preferences, and the things that change how your clients' sites behave."
        actions={
          <button
            style={{
              background: "#fff",
              color: "#0A0A10",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Save changes
          </button>
        }
      >
        <PageGrid>
          <Panel title="Email" hint="The address you sign in with.">
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)" }}>liam@example.com</div>
          </Panel>

          <Panel title="Business phone" hint="Shown on the sites you generate.">
            <input
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "9px 12px",
                color: "#fff",
                fontSize: 13,
                boxSizing: "border-box",
              }}
              defaultValue="+1 512 555 0142"
            />
          </Panel>

          <Panel title="Plan" hint="What you're on right now.">
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Pro</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              100 sites · 150 generations · 25 receptionist lines
            </div>
          </Panel>

          <Panel title="Address" hint="Used on invoices.">
            <textarea
              style={{
                width: "100%",
                minHeight: 84,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "9px 12px",
                color: "#fff",
                fontSize: 13,
                boxSizing: "border-box",
                resize: "vertical",
              }}
              defaultValue={"112 Northgate St\nAustin, TX"}
            />
          </Panel>

          <Panel
            span
            title="Danger zone"
            hint="A full-width panel, for anything that would be cramped in a column."
          >
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)" }}>
              Deleting your account removes every site you have published.
            </div>
          </Panel>
        </PageGrid>
      </PageShell>
    </div>
  );
}
