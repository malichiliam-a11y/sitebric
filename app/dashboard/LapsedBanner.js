"use client";

// The one thing on this screen that must not be missable.
export default function LapsedBanner({ notice, onFix }) {
  if (!notice) return null;
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        padding: "12px 20px",
        background: "rgba(220,38,38,0.14)",
        borderBottom: "1px solid rgba(248,113,113,0.34)",
        flexShrink: 0,
        zIndex: 3,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FCA5A5", marginBottom: 2 }}>
          {notice.title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(255,255,255,0.78)", maxWidth: 720 }}>
          {notice.body}
        </div>
      </div>
      <button
        onClick={onFix}
        style={{
          background: "#fff",
          color: "#0A0A10",
          border: "none",
          borderRadius: 8,
          padding: "9px 18px",
          fontWeight: 700,
          fontSize: 12.5,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Restart my plan →
      </button>
    </div>
  );
}

