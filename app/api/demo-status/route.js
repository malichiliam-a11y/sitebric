import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Public and unauthenticated on purpose — anyone with a jobId can check
// on it, the same way anyone with a UPS tracking number can. jobIds are
// random UUIDs, not enumerable, and the row holds nothing sensitive.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "missing jobId" }, { status: 400 });
  }

  const { data: job } = await supabaseAdmin
    .from("demo_jobs")
    .select("status, code, error, client_name, created_at")
    .eq("id", jobId)
    .single();

  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    code: job.status === "done" ? job.code : null,
    error: job.status === "error" ? job.error : null,
    clientName: job.client_name,
    createdAt: job.created_at,
  });
}
