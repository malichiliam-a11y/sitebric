import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { projectId, domain } = await req.json();
  if (!projectId || !domain) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Confirm this project actually belongs to the logged-in user.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  // Register the domain with Vercel so it can issue SSL and route traffic.
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  const vercelRes = await fetch(
    `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  const vercelData = await vercelRes.json();

  if (!vercelRes.ok) {
    return NextResponse.json(
      { error: vercelData?.error?.message || "Failed to connect domain with Vercel" },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ custom_domain: domain })
    .eq("id", projectId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    verification: vercelData.verification || null,
  });
}
