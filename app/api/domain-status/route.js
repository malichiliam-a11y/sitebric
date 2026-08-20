import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { domainStatus, DOMAIN_STATES } from "@/lib/domain-status";

// Is this project's custom domain actually serving yet?
//
// Read-only. It buys nothing, changes nothing, and holds no opinion about
// plans — someone whose plan lapsed after connecting a domain still needs
// to be able to see what that domain is doing. /api/connect-domain is
// where the plan gate belongs, because that is the call that spends.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Vercel is a third party in the request path of a screen someone is
// watching. Two calls under one budget, and a slow answer becomes
// "couldn't check" rather than a spinner that never resolves.
const VERCEL_TIMEOUT_MS = 8000;

async function vercelGet(path, signal) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return null;

  const team = process.env.VERCEL_TEAM_ID
    ? `${path.includes("?") ? "&" : "?"}teamId=${process.env.VERCEL_TEAM_ID}`
    : "";

  try {
    const res = await fetch(`https://api.vercel.com${path}${team}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      cache: "no-store",
    });
    // A 404 is a real answer — the domain is not on the project — but it
    // is not a shape this route can read, so it joins the failures and
    // resolves to "unknown" rather than to "live".
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Aborted, offline, or Vercel returned something that isn't JSON.
    // Never throws: this route reports on a problem, it shouldn't add one.
    return null;
  }
}

export async function GET(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const projectId = String(new URL(req.url).searchParams.get("projectId") || "").slice(0, 40);
  if (!projectId) return NextResponse.json({ error: "missing projectId" }, { status: 400 });

  // Read through the user's own client so RLS decides what they can see,
  // and so this can't be used to ask about somebody else's domain.
  const { data: project } = await supabase
    .from("projects")
    .select("id, custom_domain")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const domain = String(project.custom_domain || "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ status: { state: DOMAIN_STATES.NONE, domain: "" } });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERCEL_TIMEOUT_MS);

  // Both facts at once. They are independent lookups and the screen needs
  // both before it can say anything, so serialising them would only make
  // the person wait twice.
  const encoded = encodeURIComponent(domain);
  const [domainInfo, configInfo] = await Promise.all([
    vercelGet(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encoded}`, controller.signal),
    vercelGet(`/v6/domains/${encoded}/config`, controller.signal),
  ]);
  clearTimeout(timer);

  return NextResponse.json({ status: domainStatus({ domain, domainInfo, configInfo }) });
}
