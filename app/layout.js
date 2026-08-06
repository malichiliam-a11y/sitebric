import { Analytics } from "@vercel/analytics/react";
export const metadata = {
  title: "sitebric",
  description: "Generate client websites with AI",
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        {/* Inter only — Space Grotesk was dropped when the type system
            consolidated onto one family, so it no longer has to load. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#050505",
          color: "#EDEDED",
          WebkitFontSmoothing: "antialiased",
        }}
      >
       {children}
        <Analytics />
      </body>
    </html>
  );
}
