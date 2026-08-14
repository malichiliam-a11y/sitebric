import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/site";

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

// metadataBase makes the generated OG image resolve to an absolute URL.
// Without it Next emits a relative path, which every link preview — Discord,
// iMessage, X, WhatsApp — silently drops, so the card renders bare.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages that export their own title replace this outright — the audience
  // pages already carry the brand in theirs, so there's no suffix template
  // here that would double it up.
  title: "Sitebric — generate client websites with AI",
  description:
    "Describe a client's business and get a finished, ready-to-hand-off website in seconds. Built for website resellers, agencies and freelancers.",
  openGraph: {
    title: "Sitebric — generate client websites with AI",
    description:
      "Describe a client's business and get a finished, ready-to-hand-off website in seconds.",
    url: SITE_URL,
    siteName: "Sitebric",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sitebric — generate client websites with AI",
    description:
      "Describe a client's business and get a finished, ready-to-hand-off website in seconds.",
  },
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
