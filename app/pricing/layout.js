import { softwareApplicationSchema, jsonLdProps } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

// The pricing page is a client component and so cannot export metadata
// itself. Without this it inherited the root title and description
// verbatim, which meant the home page and the pricing page were
// indistinguishable in search results — the word "pricing" appeared
// nowhere a crawler reads, on the one page whose whole job is pricing.
export const metadata = {
  title: "Pricing — Sitebric | AI client websites from $15/mo",
  description:
    "Sitebric plans start at $15/mo: 5 client sites, 10 AI generations and 20 lead searches. " +
    "Growth and Pro add custom domains and higher limits. No contracts — cancel anytime.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing — Sitebric | AI client websites from $15/mo",
    description:
      "Plans from $15/mo. Generate finished client websites, connect custom domains, cancel anytime.",
    url: `${SITE_URL}/pricing`,
    siteName: "Sitebric",
    type: "website",
  },
};

export default function PricingLayout({ children }) {
  return (
    <>
      <script {...jsonLdProps(softwareApplicationSchema())} />
      {children}
    </>
  );
}
