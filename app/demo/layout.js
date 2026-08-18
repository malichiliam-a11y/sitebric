import { SITE_URL } from "@/lib/site";

// Same reason as the pricing layout: the demo page is a client component,
// so it inherited the root title and read as a duplicate of the home page
// in search results. This is the page someone lands on from "try an AI
// website builder without signing up", so it should say so.
export const metadata = {
  title: "Live demo — Sitebric | Watch an AI build a real website",
  description:
    "Describe a business and watch Sitebric generate a real, finished website in seconds. " +
    "No signup and no card — the same AI that powers Sitebric, free to try.",
  alternates: { canonical: `${SITE_URL}/demo` },
  openGraph: {
    title: "Live demo — Sitebric | Watch an AI build a real website",
    description:
      "Describe a business and watch a finished website build in seconds. No signup required.",
    url: `${SITE_URL}/demo`,
    siteName: "Sitebric",
    type: "website",
  },
};

export default function DemoLayout({ children }) {
  return children;
}
