import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ownerServiceState } from "@/lib/owner-state";
import { sitesServe } from "@/lib/entitlements";
import { offlinePage } from "@/lib/offline-page";

// Public route — no login required. Serves the raw generated HTML for
// a client site, but only if it has been explicitly published AND the
// reseller who published it is still on a plan.

// The page is built in lib/offline-page.js so it stays pure and testable;
// only the framework wrapper lives here.
function offline() {
  const page = offlinePage();
  return new NextResponse(page.body, { status: page.status, headers: page.headers });
}

export async function GET(req, { params }) {
  const supabase = createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("code, published, status, user_id")
    .eq("id", params.id)
    .single();

  if (error || !project || !project.published || project.status !== "done" || !project.code) {
    return new NextResponse(
      "<h1 style='font-family:sans-serif'>This site isn't published (or doesn't exist).</h1>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Published is not the same as paid for. Without this, cancelling kept
  // every site the account ever published online for free, forever.
  if (!sitesServe(await ownerServiceState(project.user_id))) return offline();

  return new NextResponse(project.code, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
