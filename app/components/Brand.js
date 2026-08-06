// The mark from the reference design: two offset slashes reading as a
// lightning bolt. Kept as a component so the login page, dashboard
// sidebar and auth card can't drift apart.
export function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M18.5 3 6 17.5h7.5L11 29 25 13.5h-8L18.5 3Z" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ size = 22, gap = 10, markSize }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, color: "#FFFFFF" }}>
      <LogoMark size={markSize || size + 4} />
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: size, letterSpacing: "-0.02em" }}>
        sitebric
      </span>
    </span>
  );
}
