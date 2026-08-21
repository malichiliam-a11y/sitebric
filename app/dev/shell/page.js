import { notFound } from "next/navigation";
import Harness from "./harness-client";

// The dashboard page frame, at every width, without a login.
//
// The tab bodies live inline in dashboard-client.js behind a Supabase
// session, so the frame they all share is the piece that can actually be
// looked at. Same pattern as app/dev/receptionist and app/dev/domain:
// 404 in production, driven by test/shell-ui.mjs.
//
//   npm run dev  &&  node test/shell-ui.mjs

export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
