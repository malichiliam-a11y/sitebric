// Structured data (JSON-LD) for the marketing pages.
//
// Search engines and AI assistants read this to decide what a site *is*.
// Without it they infer a product, its price and its category from prose,
// which is guesswork — and ChatGPT-style answers lean on the structured
// description heavily when summarising a product they were asked about.
//
// Everything here is derived from lib/plans.js so the advertised price
// and allowances cannot drift away from what the product enforces.
//
// One rule with schema: it must describe what is actually on the page.
// FAQ entries here are the same four that render on the home page, taken
// from the same source. Marking up questions a visitor cannot see is what
// gets rich results revoked, so don't add any that aren't on screen.

import { PLAN_LIMITS, PLAN_PRICES as PLAN_PRICE_CENTS, PLAN_YEARLY_PRICES } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";

// Derived from lib/plans.js rather than written out again. Stated here
// as whole dollars, this said $29 and $69 while Stripe was charging
// $29.99 and $69.99 — structured data advertising a price the checkout
// does not honour is exactly the mismatch this markup exists to avoid.
const dollars = (cents) => (cents / 100).toFixed(2);

const PLAN_ORDER = ["starter", "growth", "pro"];

function offer(plan) {
  const limits = PLAN_LIMITS[plan];
  return {
    "@type": "Offer",
    name: limits.label,
    price: dollars(PLAN_PRICE_CENTS[plan]),
    priceCurrency: "USD",
    url: `${SITE_URL}/pricing`,
    availability: "https://schema.org/InStock",
    description:
      `${limits.sites} client sites, ${limits.generations} AI generations per month, ` +
      `${limits.searches} lead searches per month.`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: dollars(PLAN_PRICE_CENTS[plan]),
      priceCurrency: "USD",
      billingDuration: 1,
      billingIncrement: 1,
      unitCode: "MON",
    },
  };
}

function yearlyOffer(plan) {
  const limits = PLAN_LIMITS[plan];
  return {
    "@type": "Offer",
    name: `${limits.label} (yearly)`,
    price: dollars(PLAN_YEARLY_PRICES[plan]),
    priceCurrency: "USD",
    url: `${SITE_URL}/pricing`,
    availability: "https://schema.org/InStock",
    description: `${limits.label} billed yearly — two months free versus paying monthly.`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: dollars(PLAN_YEARLY_PRICES[plan]),
      priceCurrency: "USD",
      billingDuration: 12,
      billingIncrement: 1,
      unitCode: "MON",
    },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sitebric",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Website Builder",
    // Named because it is the honest answer to "what do I need to run
    // this" — there is nothing to install.
    operatingSystem: "Web browser",
    description:
      "Sitebric generates finished client websites from a description of the business. " +
      "Built for website resellers, agencies and freelancers who hand the site off to a client.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: dollars(Math.min(...PLAN_ORDER.map((p) => PLAN_PRICE_CENTS[p]))),
      highPrice: dollars(Math.max(...PLAN_ORDER.map((p) => PLAN_PRICE_CENTS[p]))),
      offerCount: PLAN_ORDER.length * 2,
      offers: [
        ...PLAN_ORDER.map((p) => offer(p)),
        ...PLAN_ORDER.map((p) => yearlyOffer(p)),
      ],
    },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sitebric",
    url: SITE_URL,
    description:
      "Sitebric generates finished client websites for resellers, agencies and freelancers.",
  };
}

// Mirrors the four questions rendered on the home page.
export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// React escapes <, >, ' and " in the text child of a <script>, exactly as
// it does in a <style>, which corrupts the JSON and makes the block
// unparseable — invisible unless you view source. So this always goes in
// through dangerouslySetInnerHTML.
//
// JSON.stringify cannot emit "</script" on its own, but a string value
// that contained it would end the tag early, so it is escaped defensively.
export function jsonLdProps(schema) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
    },
  };
}
