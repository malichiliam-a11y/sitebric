import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Serves a finished site to anyone holding its private link, whether or
// not it has been published.
//
// This exists because publishing was being used as a share button. A
// reseller who wanted to show a client the site had no way to send them a
// link without putting it on the public internet first, so seven sites
// were published, shown, and quietly taken back down again.
//
// Deliberately the admin client: an unpublished row is invisible to the
// anon key by design, which is the whole reason /s/<id> cannot do this.
// The token is the only credential, so everything hangs on it being
// unguessable and on this route checking nothing else about the caller.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function notFound() {
  return new NextResponse(
    "<h1 style='font-family:sans-serif'>This preview link isn't valid any more.</h1>",
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req, { params }) {
  const token = params?.token;

  // A short token would be worth guessing at; one this size is not. The
  // check is here as well as at generation so a truncated or hand-typed
  // link fails fast rather than running a query.
  if (!token || token.length < 24) return notFound();

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("code, status")
    .eq("share_token", token)
    .single();

  if (!project || project.status !== "done" || !project.code) return notFound();

  return new NextResponse(project.code, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // A preview is for one client, not for search results — a shared
      // draft turning up in Google would be worse than not sharing it.
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
