import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/admin";
import { makeButtonsWork } from "@/lib/fix-buttons";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const maxDuration = 300;

// Applies the button guard to sites that were generated before it existed.
//
// An audit found dead call-to-action links on 22 of 31 sites and a
// contact form wired to nothing on 12 of them — one of those published
// and live, quietly losing every enquiry. Those sites are already paid
// for, so they are repaired in place rather than regenerated: the guard
// is a pure transform over stored HTML and makes no model calls, so this
// costs nothing and consumes no generations.
//
// Idempotent. A site already carrying the fallback is left alone, so this
// can be run again safely.
export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select("id, client_name, code, published")
    .eq("status", "done")
    .not("code", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const repaired = [];
  let untouched = 0;

  for (const project of projects || []) {
    // The guard replaces any earlier copy of itself rather than stacking,
    // so this runs unconditionally and a site whose guard is out of date
    // gets the current one. Sites already correct come out byte-identical
    // and are counted as untouched.
    const result = makeButtonsWork(project.code, project.id);
    const nextCode = result.code;

    if (nextCode === project.code) {
      untouched++;
      continue;
    }

    const { error: saveError } = await supabaseAdmin
      .from("projects")
      .update({ code: nextCode })
      .eq("id", project.id);

    if (saveError) {
      return NextResponse.json(
        { error: `Failed on ${project.client_name}: ${saveError.message}`, repaired },
        { status: 500 }
      );
    }

    repaired.push({
      client: project.client_name,
      published: project.published,
      deadLinksFixed: result.deadLinksFixed ?? 0,
    });
  }

  console.log(`Repaired ${repaired.length} site(s), ${untouched} already fine`);

  return NextResponse.json({
    ok: true,
    repaired: repaired.length,
    untouched,
    totalDeadLinksFixed: repaired.reduce((n, r) => n + r.deadLinksFixed, 0),
    details: repaired,
  });
}
