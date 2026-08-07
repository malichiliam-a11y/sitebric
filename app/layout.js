import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

// Self-hosted at build time rather than a runtime <link> to Google.
// Removes a render-blocking third-party request, kills the flash of
// fallback text, and means the page cannot render in the wrong face if
// fonts.googleapis.com is slow or blocked.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "sitebric",
  description: "Generate client websites with AI",
  verification: {
    google: "MVETH97B41E6pVIEJhrAe35ZevjcaFX5R5UcJIwHZnk",
  },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#000000",
          color: "#EDEDED",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
