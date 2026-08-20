import { notFound } from "next/navigation";
import Harness from "./harness-client";

// The connected-domain panel in every state, without a Supabase session.
//
// Same reasoning as app/dev/receptionist/: this panel only appears for a
// published project with a domain attached, on a paid plan, which means
// it was previously reviewed by reading the diff. That is how it came to
// claim "connected" for a domain pointing at nothing.
//
// 404 in production. Drive it with:
//   npm run dev  &&  node test/domain-ui.mjs

export const dynamic = "force-dynamic";

export default function Page({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness state={searchParams?.state || "waiting"} />;
}
