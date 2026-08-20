import { notFound } from "next/navigation";
import Harness from "./harness-client";

// The receptionist tab in every plan state, without a Supabase session.
//
// This repo's notes say to verify UI by driving the real page in a browser
// rather than by reading the diff, and that screenshots have caught things
// static review missed every time. The receptionist screen needs a login,
// a plan, a Twilio account and a bought phone number before it draws
// anything — so in practice it was reviewed by reading, which is how the
// line selector shipped with a bug that would have written one client's
// emergency number onto another client's line.
//
// Kept in the tree rather than rebuilt from scratch each time, and 404 in
// production so it is never a real page on a real domain.
//
// Drive it with:  npm run dev  &&  node test/receptionist-ui.mjs

export const dynamic = "force-dynamic";

export default function Page({ searchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness state={searchParams?.state || "trial"} />;
}
