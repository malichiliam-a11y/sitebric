import { ImageResponse } from "next/og";

// Generated at build time rather than committed as a binary, so the card
// can't drift out of sync with the copy the way a hand-exported PNG does.
//
// ImageResponse supports a narrow CSS subset — flexbox only, no grid, and
// every element with more than one child needs an explicit display:flex.
// Layouts that look fine in a browser will silently misrender here.

export const alt = "Sitebric — generate client websites with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path d="M15.5 3H29L17.5 14H4L15.5 3Z" fill="#EDEDED" />
            <path d="M14.5 18H28L16.5 29H3L14.5 18Z" fill="#EDEDED" />
          </svg>
          <span style={{ marginLeft: 13, fontSize: 28, fontWeight: 500, color: "#EDEDED", letterSpacing: "-0.025em" }}>
            sitebric
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
            }}
          >
            Generate real client
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              color: "#FFFFFF",
            }}
          >
            websites with AI,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              color: "rgba(255,255,255,0.40)",
            }}
          >
            in seconds.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 9,
              height: 9,
              borderRadius: 99,
              background: "#4ADE80",
              marginRight: 14,
            }}
          />
          <div style={{ display: "flex", fontSize: 23, color: "rgba(255,255,255,0.56)" }}>
            Built for website resellers · sitebric.com
          </div>
        </div>
      </div>
    ),
    size
  );
}
