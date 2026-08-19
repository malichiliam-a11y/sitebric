import "./globals.css";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/site";

// Self-hosted at build time rather than a runtime <link> to Google.
// Removes a render-blocking third-party request, kills the flash of
// fallback text, and means the page cannot render in the wrong face if
// fonts.googleapis.com is slow or blocked.
//
// Two faces, doing different jobs. Everything used to be Inter, which is
// the typeface every generated SaaS page on the internet is set in — the
// owner's words were that it "looks like a robot made it", and he was
// right. A product that sells websites cannot itself look generated.
//
// Fraunces carries the headlines. A real serif is the single clearest
// signal that a person designed something rather than a template
// generator, and its optical-size axis means a 56px hero and a 20px
// section heading are drawn differently rather than scaled.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

// Manrope does the reading. Chosen over another serif because interface
// copy at 12-14px needs to be unambiguous, not characterful — and over
// Inter because the whole point was to stop looking like everyone else.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-body",
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
    // Bing has no dedicated field in Next's metadata type, so it goes
    // through `other` as the raw meta name Bing looks for. Worth keeping
    // even though Bing can import verification from Search Console:
    // ChatGPT's search results come from Bing's index, not Google's.
    other: {
      "msvalidate.01": "4A11B2CF2A2FCC4E6D69802A6AD201AF",
    },
  },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif",
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
