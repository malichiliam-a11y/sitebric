import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AUDIENCES, getAudience } from "@/lib/audiences";
import { SITE_URL } from "@/lib/site";
import AudienceLanding from "./AudienceLanding";

// Every audience page is known at build time, so all three prerender to
// static HTML — the copy is in the source for crawlers, and a visitor
// arriving from an ad gets the page without waiting on a render.
export function generateStaticParams() {
  return AUDIENCES.map((a) => ({ audience: a.slug }));
}

// Anything outside the three slugs is a 404 rather than a rendered page,
// so a mistyped ad URL can't quietly become an indexable empty page.
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { audience: string } }): Metadata {
  const audience = getAudience(params.audience);
  if (!audience) return {};

  const url = `${SITE_URL}/for/${audience.slug}`;
  return {
    title: audience.metaTitle,
    description: audience.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: audience.metaTitle,
      description: audience.metaDescription,
      url,
      siteName: "Sitebric",
      type: "website",
      // Declaring openGraph here replaces the root layout's wholesale, and
      // the app/opengraph-image card goes with it — these pages shipped
      // previewing blank in DMs, which is where they get shared most.
      // Named explicitly so it survives the override.
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Sitebric" }],
    },
    twitter: {
      card: "summary_large_image",
      title: audience.metaTitle,
      description: audience.metaDescription,
    },
  };
}

export default function AudiencePage({ params }: { params: { audience: string } }) {
  const audience = getAudience(params.audience);
  if (!audience) notFound();

  return <AudienceLanding audience={audience} />;
}
