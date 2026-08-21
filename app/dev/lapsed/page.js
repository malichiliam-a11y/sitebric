import { notFound } from "next/navigation";
import Harness from "./harness-client";

// The cancellation banner in each of its states, without a session.
//
// The same pattern as app/dev/receptionist and app/dev/domain: a fixture
// page that 404s in production, plus a Playwright driver in test/. This
// banner is the only warning a reseller gets before their clients' sites
// go dark, so "it renders and it's legible on a phone" is worth proving
// rather than assuming.
//
//   npm run dev  &&  node test/lapsed-ui.mjs

export const dynamic = "force-dynamic";

export default function Page({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness state={searchParams?.state || "grace"} />;
}
