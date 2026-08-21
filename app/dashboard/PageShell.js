"use client";

// The frame every dashboard tab sits in.
//
// Written because the tabs had drifted: Find Leads ran to 1200px while
// Billing, Invoices, Referrals, Profile and Settings were all pinned at
// 640. On a laptop that is less than half the window, so most of the
// product looked like a phone app stretched across a desktop — a single
// narrow column with a field of empty black beside it.
//
// Two things fix that, and only one of them is the width:
//
//   The cap goes up, but not to 100%. A settings form spanning 2500px is
//   not "using the space", it is unreadable — the eye loses the start of
//   the next line. WIDE is the ceiling; past that the content centres.
//
//   The cards flow into columns. A single column at any width is still a
//   single column, so the panels sit in an auto-filling grid and a wide
//   screen gets two or three across instead of one and a lot of nothing.
//
// Monochrome on purpose. The product is black and white and staying that
// way; depth here comes from borders, spacing and a one-pixel highlight
// along the top edge of each panel, not from colour.

const DISPLAY = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";

// Wide enough to hold three cards; narrow enough that a line of text
// still scans.
export const WIDE = 1400;

export function PageShell({ title, subtitle, actions, children, max = WIDE }) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        // Generous on a desktop, tight on a phone. clamp rather than a
        // media query so it moves continuously instead of jumping.
        padding: "clamp(24px, 4vw, 48px) clamp(16px, 3.5vw, 44px) 72px",
      }}
    >
      <div style={{ width: "100%", maxWidth: max, marginInline: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                // Scales with the window instead of sitting at one size
                // that is either small on a monitor or huge on a phone.
                fontSize: "clamp(22px, 2.4vw, 30px)",
                letterSpacing: "-0.02em",
                margin: "0 0 6px",
                color: "#FFFFFF",
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.45)",
                  maxWidth: 680,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Panels flowing into as many columns as fit.
 *
 * `min` is the narrowest a panel may get before the grid drops a column.
 * Raise it for panels holding a form, lower it for ones holding a number.
 */
export function PageGrid({ children, min = 340, gap = 16 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
        gap,
        // Stretch, not start. Ragged card bottoms across a row read as an
        // accident; equal heights read as a layout somebody drew.
        alignItems: "stretch",
      }}
    >
      {children}
    </div>
  );
}

/**
 * One card.
 *
 * `span` lets a panel take the full row — for something wide like a table
 * that would be cramped in a column.
 */
export function Panel({ title, hint, children, span = false, padding = 22 }) {
  return (
    <section
      style={{
        position: "relative",
        borderRadius: 16,
        padding,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.09)",
        gridColumn: span ? "1 / -1" : "auto",
        overflow: "hidden",
      }}
    >
      {/* A one-pixel highlight along the top edge. The only "futuristic"
          trick in here, and it survives being monochrome: it reads as
          light catching an edge rather than as a colour. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 1,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)",
        }}
      />
      {title && (
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "-0.01em",
            margin: "0 0 4px",
            color: "#FFFFFF",
          }}
        >
          {title}
        </h2>
      )}
      {hint && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,0.5)" }}>
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}
