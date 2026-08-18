import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/site";

// Hands back the private link for a site, creating one the first time.
//
// The token is the only thing protecting the preview, so it comes from a
// cryptographic source rather than Math.random or a timestamp — 32 bytes
// of base64url, which is not worth guessing at.
function newToken() {
  return randomBytes(24).toString("base64url");
}

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { projectId, revoke } = await req.json();
  if (!projectId) return NextResponse.json({ error: "missing projectId" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, share_token, status, code")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Turning the link off matters as much as turning it on: a reseller who
  // shared a site with a prospect that didn't buy needs a way to stop
  // them having it.
  if (revoke) {
    const { error } = await supabase
      .from("projects")
      .update({ share_token: null })
      .eq("id", projectId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ url: null });
  }

  if (project.status !== "done" || !project.code) {
    return NextResponse.json(
      { error: "This site isn't finished building yet." },
      { status: 400 }
    );
  }

  // Reuse the existing token rather than minting a new one, so a link
  // already sent to a client keeps working.
  if (project.share_token) {
    return NextResponse.json({ url: `${SITE_URL}/preview/${project.share_token}` });
  }

  // The unique index can still reject a token in the vanishingly unlikely
  // case of a collision, so this retries rather than surfacing a raw
  // database error to someone trying to send their client a link.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newToken();
    const { error } = await supabase
      .from("projects")
      .update({ share_token: token })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (!error) return NextResponse.json({ url: `${SITE_URL}/preview/${token}` });
    const collision = error.code === "23505" || /share_token/i.test(error.message || "");
    if (!collision) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Couldn't create a link — try again." }, { status: 500 });
}
