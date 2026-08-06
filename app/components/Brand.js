// The mark from the reference design: two offset slabs sheared into a
// lightning form. Kept as a component so the login page, dashboard
// sidebar and auth card can't drift apart.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M15.5 3H29L17.5 14H4L15.5 3Z" fill="currentColor" />
      <path d="M14.5 18H28L16.5 29H3L14.5 18Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 22, gap = 12, markSize }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, color: "#FFFFFF" }}>
      <LogoMark size={markSize || size + 6} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: size, letterSpacing: "-0.02em" }}>
        sitebric
      </span>
    </span>
  );
}
