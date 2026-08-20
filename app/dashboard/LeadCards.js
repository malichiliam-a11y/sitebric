"use client";

// The two shapes a lead takes on screen: a card in the search grid, and a
// row in the saved call list.
//
// Pulled out of dashboard-client.js so they can be rendered on their own
// in a browser. Everything else in that file needs a logged-in Supabase
// session before it will draw a single pixel, which meant every UI change
// to the leads tab shipped on a reading of the diff. That is exactly the
// habit this repo's notes say has been caught out every time.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
const BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

function Badge({ children, tone }) {
  const tones = {
    good: { color: "#4ADE80", background: "rgba(74,222,128,0.12)" },
    muted: { color: "rgba(255,255,255,0.64)", background: "rgba(255,255,255,0.06)" },
    solid: { color: "#0A0A10", background: "#FFFFFF" },
  };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "2px 7px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        ...(tones[tone] || tones.muted),
      }}
    >
      {children}
    </span>
  );
}

// The whole card is clickable for the mouse, but it is deliberately NOT
// role="button". It was, briefly, and driving it in a browser showed why
// that is wrong: a button may not contain other buttons, and the card's
// accessible name is computed from everything inside it — so the card
// announced itself as one enormous button called "Northgate Locksmiths NO
// WEBSITE 112 Northgate St … Open & get the script Add to call list", and
// automation aiming for the Save button hit the card instead. A real
// button inside the card does the same job and says one thing.
export function LeadResultCard({ lead, built, saved, onOpen, onSave, onUnsave }) {
  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 14,
        padding: "16px 18px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        cursor: "pointer",
        fontFamily: BODY,
        color: "#FFFFFF",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</span>
          {/* Which pitch this is: "you have nothing" vs "yours is dated".
              Both are leads, so the badge labels rather than hides. */}
          <Badge tone={lead.hasWebsite ? "muted" : "good"}>
            {lead.hasWebsite ? "HAS A SITE" : "NO WEBSITE"}
          </Badge>
          {built && <Badge tone="solid">SITE BUILT</Badge>}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", marginBottom: 8 }}>
          {lead.address}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.74)" }}>
          {lead.phone || "No phone listed"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{
            flex: 1,
            background: "#FFFFFF",
            color: "#0A0A10",
            border: "none",
            borderRadius: 8,
            padding: "9px 16px",
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Open &amp; get the script →
        </button>
        {/* Saving is one press from the grid as well as from inside the
            panel. A search returns sixty businesses and opening each one
            to keep it would be sixty round trips. */}
        <button
          aria-label={saved ? "Remove from call list" : "Add to call list"}
          onClick={(e) => {
            e.stopPropagation();
            if (saved) onUnsave(lead.id);
            else onSave(lead);
          }}
          style={{
            background: saved ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "9px 13px",
            color: "#fff",
            fontFamily: BODY,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

export function SavedLeadRow({ row, lead, built, onOpen, onRemove }) {
  const dial = String(lead.phoneDial || lead.phone || "").replace(/[^0-9+]/g, "");

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 12,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        cursor: "pointer",
        fontFamily: BODY,
        color: "#FFFFFF",
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 3,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#FFFFFF",
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: 14,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {lead.name}
          </button>
          {!lead.hasWebsite && <Badge tone="good">NO WEBSITE</Badge>}
          {built && <Badge tone="solid">SITE BUILT</Badge>}
        </div>
        {/* Which search this came from. A list of sixty saved businesses
            from four different searches is unusable without it. */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
          {lead.phone || "No phone"}
          {row.category ? ` · ${row.category}` : ""}
          {row.location ? ` · ${row.location}` : ""}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {dial && (
          <a
            href={`tel:${dial}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Call
          </a>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(row.place_id);
          }}
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
            whiteSpace: "nowrap",
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
