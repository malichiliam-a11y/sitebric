import LoginScreen from "@/app/components/login/LoginScreen";
import { FAQS } from "@/lib/faqs";
import { organizationSchema, faqSchema, jsonLdProps } from "@/lib/structured-data";

// The front door opens on the sign-in card. The live demo is still one
// click away — "Try it live" in the nav, and the link under the card —
// but searching for sitebric.com should land on the product's front door,
// not mid-way through a demo.
//
// The structured data lives here rather than in the root layout because
// "/login" renders this same screen: duplicating an FAQPage across two
// URLs is a quality flag, and only "/" is in the sitemap.
export default function HomePage() {
  return (
    <>
      <script {...jsonLdProps(organizationSchema())} />
      <script {...jsonLdProps(faqSchema([...FAQS]))} />
      <LoginScreen initialPanel="auth" />
    </>
  );
}
