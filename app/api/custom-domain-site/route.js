import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ownerServiceState } from "@/lib/owner-state";
import { sitesServe } from "@/lib/entitlements";
import { offlinePage } from "@/lib/offline-page";

// Serves a client's published site — either from their own connected
// custom domain, or from an auto-generated <slug>.sitebric.com subdomain.
// The page is built in lib/offline-page.js so it stays pure and testable;
// only the framework wrapper lives here.
function offline() {
  const page = offlinePage();
  return new NextResponse(page.body, { status: page.status, headers: page.headers });
}

export async function GET(req) {
  const host = req.nextUrl.searchParams.get("host");
  const supabase = createClient();

  // Reached by rewriting any unrecognised host, and middleware always
  // sets this — but a request that arrives here directly does not, and
  // calling .endsWith() on null threw a 500 instead of a page.
  if (!host) {
    return new NextResponse(
      "<h1 style='font-family:sans-serif'>This domain isn't connected to a live site yet.</h1>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  let query = supabase.from("projects").select("code, published, status, user_id");

  if (host.endsWith(".sitebric.com")) {
    const slug = host.replace(".sitebric.com", "");
    query = query.eq("slug", slug);
  } else {
    query = query.eq("custom_domain", host);
  }

  const { data: project } = await query.single();

  if (!project || !project.published || project.status !== "done" || !project.code) {
    return new NextResponse(
      "<h1 style='font-family:sans-serif'>This domain isn't connected to a live site yet.</h1>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Published is not the same as paid for. Without this, cancelling left
  // every site the account had published online for free, indefinitely.
  if (!sitesServe(await ownerServiceState(project.user_id))) return offline();

  return new NextResponse(project.code, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
