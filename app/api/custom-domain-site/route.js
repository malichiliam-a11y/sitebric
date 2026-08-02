import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Serves a client's published site when their own domain points here.
export async function GET(req) {
  const host = req.nextUrl.searchParams.get("host");
  const supabase = createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("code, published, status")
    .eq("custom_domain", host)
    .single();

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
