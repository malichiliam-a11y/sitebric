import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// The reseller's call list.
//
// Every row goes through the user's own Supabase client, not the service
// role: RLS on saved_leads is then the thing that stops one reseller
// reading another's list, rather than a filter in this file that someone
// could forget to write on a later route.

export const dynamic = "force-dynamic";

// Google Maps text is a stranger's text, and it ends up in a CSV the
// reseller opens and in a script they read aloud. Whitespace is collapsed
// and length capped so a pathological place name can't bloat every future
// query or smuggle line breaks into the export.
function field(value, max = 300) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Only ever an http(s) URL — the saved website is rendered as a link with
// target="_blank", and a javascript: URL there would run in the
// dashboard's own origin.
function safeUrl(value) {
  const raw = field(value, 500);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("saved_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("saved-leads list failed:", error.message);
    return NextResponse.json({ error: "could not load your list" }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

export async function POST(req) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lead = body?.lead || {};

  const placeId = field(lead.id || lead.place_id, 200);
  const name = field(lead.name, 200);
  if (!placeId || !name) {
    return NextResponse.json({ error: "missing lead" }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    place_id: placeId,
    name,
    address: field(lead.address),
    phone: field(lead.phone, 60),
    phone_dial: field(lead.phoneDial || lead.phone_dial, 60),
    maps_url: safeUrl(lead.mapsUrl || lead.maps_url) || "",
    website: safeUrl(lead.website),
    has_website: Boolean(lead.hasWebsite ?? lead.has_website),
    category: field(body.category, 80),
    location: field(body.location, 80),
  };

  // Saving the same business from a second search should not put it on
  // the call list twice — the unique index on (user_id, place_id) plus
  // this upsert make the button idempotent.
  const { data, error } = await supabase
    .from("saved_leads")
    .upsert(row, { onConflict: "user_id,place_id" })
    .select()
    .single();

  if (error) {
    console.error("saved-leads save failed:", error.message);
    return NextResponse.json({ error: "could not save that lead" }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(req) {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const placeId = field(new URL(req.url).searchParams.get("placeId"), 200);
  if (!placeId) return NextResponse.json({ error: "missing placeId" }, { status: 400 });

  // The user_id filter is belt and braces — the RLS delete policy already
  // restricts this to their own rows.
  const { error } = await supabase
    .from("saved_leads")
    .delete()
    .eq("user_id", user.id)
    .eq("place_id", placeId);

  if (error) {
    console.error("saved-leads delete failed:", error.message);
    return NextResponse.json({ error: "could not remove that lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
