import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Called from generated client sites — visitors submitting the "book a
// meeting" / contact form are never authenticated sitebric users, and a
// published site can live on the client's own custom domain, so this
// bypasses RLS with the service-role key and allows cross-origin requests.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Caps how many inquiries a single generated site can send in an hour —
// otherwise this is a public unauthenticated endpoint that sends email on
// every call, an easy target for spam.
const MAX_INQUIRIES_PER_HOUR = 20;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

  if (!projectId || !name || !contact) {
    return NextResponse.json(
      { error: "missing fields" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, client_name, owner_email, published, status")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || !project.published || project.status !== "done") {
    return NextResponse.json(
      { error: "not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("site_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", oneHourAgo);

  if (count >= MAX_INQUIRIES_PER_HOUR) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const { error: insertError } = await supabaseAdmin.from("site_inquiries").insert({
    project_id: projectId,
    name,
    contact,
    message: message || null,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "failed to record inquiry" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // Best-effort — a visitor's inquiry is already saved even if the
  // business has no owner_email on file, or the send itself fails.
  if (project.owner_email) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sitebric Leads <leads@sitebric.com>",
          to: [project.owner_email],
          reply_to: contact.includes("@") ? contact : undefined,
          subject: `New inquiry from your website — ${name}`,
          text: `${name} sent an inquiry through your ${project.client_name} website.\n\nContact: ${contact}\n\nMessage:\n${message || "(no message included)"}`,
        }),
      });
    } catch (err) {
      console.error("Lead notification email failed:", err.message);
    }
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
