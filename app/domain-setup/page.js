import DomainSetupDeck from "./DomainSetupDeck";
import { SITE_URL } from "@/lib/site";

// A public help page, so a reseller can hand the link to a client — or
// paste it in a community — without it living on someone else's domain.
export const metadata = {
  title: "Domain Setup, Step by Step — Sitebric",
  description:
    "How to point a client's own domain at their Sitebric site: publish, connect the domain, then " +
    "switch the nameservers at the registrar. Includes the email warning most guides leave out.",
  alternates: { canonical: `${SITE_URL}/domain-setup` },
  openGraph: {
    title: "Domain Setup, Step by Step — Sitebric",
    description:
      "Four steps to put a client's site on their own domain, and the two mistakes that cause most of the trouble.",
    url: `${SITE_URL}/domain-setup`,
    siteName: "Sitebric",
    type: "article",
  },
};

export default function DomainSetupPage() {
  return <DomainSetupDeck />;
}
