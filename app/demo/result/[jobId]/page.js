import { createClient as createAdminClient } from "@supabase/supabase-js";
import DemoResultClient from "./DemoResultClient";

// A shared demo link used to preview as the generic site title, which says
// nothing about what's behind it. Naming the business is the whole reason
// someone forwards one of these — "look what it made for Joe's Barbershop"
// is a reason to click, "Sitebric — generate client websites with AI" isn't.
//
// Same read as /api/demo-status: admin client, public row, nothing
// sensitive on it. Only the name is read; the generated code is not
// touched here.
export async function generateMetadata({ params }) {
  const jobId = params?.jobId;
  let clientName = null;

  if (jobId) {
    try {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabaseAdmin
        .from("demo_jobs")
        .select("client_name")
        .eq("id", jobId)
        .single();
      clientName = data?.client_name || null;
    } catch {
      // A metadata lookup must never take the page down — fall through to
      // the generic title and let the client component render as normal.
    }
  }

  const title = clientName
    ? `A website for ${clientName}, built by AI in about a minute`
    : "A website built by AI in about a minute";

  return {
    title,
    description:
      "Made with Sitebric — describe a business, get a finished website. Try it free, no signup needed.",
    openGraph: {
      title,
      description:
        "Made with Sitebric — describe a business, get a finished website. Try it free, no signup needed.",
      siteName: "Sitebric",
      type: "website",
      // Declaring openGraph replaces the root layout's, image included, so
      // the card has to be named again here or shares preview blank.
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Sitebric" }],
    },
    twitter: { card: "summary_large_image", title },
    // A generated preview is throwaway and per-visitor; it has no business
    // in search results competing with the real pages.
    robots: { index: false, follow: true },
  };
}

export default function DemoResultPage({ params }) {
  return <DemoResultClient jobId={params?.jobId || null} />;
}
