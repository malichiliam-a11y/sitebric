import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { applyLogo, removeLogo, currentLogoUrl } from "@/lib/logo";

// Swapping the wordmark for a real logo is a pure string transform over
// stored HTML — no model call. So this is instant, costs nothing to run,
// and deliberately does NOT touch generations_used: charging a whole
// generation to put a client's logo on their own site is what made this
// the most-complained-about part of the product.
export const maxDuration = 30;

// The bucket the dashboard already uploads client photos into, so a logo
// is stored the same way as everything else and needs no new plumbing.
const ALLOWED_HOST_SUFFIX = ".supabase.co";

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { projectId, logoUrl } = await req.json();
  if (!projectId) return NextResponse.json({ error: "missing projectId" }, { status: 400 });

  // Only ever point at our own storage. Without this the field would
  // happily embed any URL on the internet into a customer's live site.
  if (logoUrl) {
    let host;
    try {
      const parsed = new URL(logoUrl);
      host = parsed.hostname;
      if (parsed.protocol !== "https:") throw new Error("not https");
    } catch {
      return NextResponse.json({ error: "That doesn't look like a valid image link." }, { status: 400 });
    }
    if (!host.endsWith(ALLOWED_HOST_SUFFIX)) {
      return NextResponse.json(
        { error: "Logos have to be uploaded here rather than linked from another site." },
        { status: 400 }
      );
    }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, code, client_name, status")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.status !== "done" || !project.code) {
    return NextResponse.json({ error: "This site isn't finished yet." }, { status: 400 });
  }

  // An empty logoUrl means "put the wordmark back".
  if (!logoUrl) {
    const restored = removeLogo(project.code);
    const { error } = await supabase
      .from("projects")
      .update({ code: restored })
      .eq("id", projectId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, logoUrl: null });
  }

  const result = applyLogo(project.code, {
    logoUrl,
    businessName: project.client_name || "",
  });

  // Reported rather than swallowed: a site whose nav this can't find would
  // otherwise show a success message and change nothing on screen.
  if (!result.changed) {
    return NextResponse.json(
      {
        error:
          "Couldn't find the logo spot in this site's menu bar. Ask in the chat box to " +
          "\"put the logo in the header\" instead.",
      },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({ code: result.code })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, logoUrl: currentLogoUrl(result.code) });
}
