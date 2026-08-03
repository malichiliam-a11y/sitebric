import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Serves a client's published site — either from their own connected
// custom domain, or from an auto-generated <slug>.sitebric.com subdomain.
export async function GET(req) {
  const host = req.nextUrl.searchParams.get("host");
  const supabase = createClient();

  let query = supabase.from("projects").select("code, published, status");

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

  return new NextResponse(project.code, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
