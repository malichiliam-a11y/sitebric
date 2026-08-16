import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generatePage } from "@/lib/multipage";
import { friendlyGenerationError } from "@/lib/generation-errors";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 300;

// One page, one request, one whole function budget. This is the entire
// point of the split: a four-page build used to run every model call
// inside a single request, so the pieces shared one 300-second ceiling
// and any one of them overrunning killed all the others — after they had
// already been generated and billed.
//
// Each page now gets its own 300 seconds to do about 90 seconds of work,
// and the four run as four concurrent requests. A page that fails is
// retried on its own without touching the ones that succeeded.
const DEADLINE_MS = 240000;

const VALID = new Set(["home", "services", "about", "contact"]);

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { projectId, page } = await req.json();
  if (!projectId || !VALID.has(page)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Scoped to the caller's own row by user_id, so a project id from
  // somewhere else can't be used to spend our API budget.
  const { data: project } = await supabase
    .from("projects")
    .select("id, client_name, prompt, build, phone, address, calendly_url")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const build = project.build || {};
  if (!build.shell) {
    return NextResponse.json({ error: "shell_missing" }, { status: 409 });
  }

  // Already done — makes a client retry safe and free.
  if (build.pages?.[page]) {
    return NextResponse.json({ page, status: "done", cached: true });
  }

  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), DEADLINE_MS);

  try {
    const html = await generatePage({
      anthropic,
      name: page,
      clientName: project.client_name,
      brief: project.prompt,
      contactBlock: build.contactBlock || "",
      imageBlock: build.imageBlock || "",
      shell: build.shell,
      signal: deadline.signal,
    });

    // Re-read immediately before writing: the four page requests run
    // concurrently and each rewrites this column, so a value read at the
    // start of a 90-second generation would be stale and would drop
    // whichever pages landed while this one was working.
    const { data: fresh } = await supabase
      .from("projects")
      .select("build")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    const merged = {
      ...(fresh?.build || build),
      pages: { ...(fresh?.build?.pages || {}), [page]: html },
    };

    const { error: saveError } = await supabase
      .from("projects")
      .update({ build: merged })
      .eq("id", projectId)
      .eq("user_id", user.id);

    if (saveError) throw new Error(`Failed to save page: ${saveError.message}`);

    return NextResponse.json({
      page,
      status: "done",
      ready: Object.keys(merged.pages).length,
    });
  } catch (err) {
    console.error(`Page generation failed (${page}):`, err?.status || "", err?.message);
    return NextResponse.json({ error: friendlyGenerationError(err), page }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
