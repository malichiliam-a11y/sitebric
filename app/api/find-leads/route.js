import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Used only to increment searches_used — bypasses RLS since users
// don't have update permission on their own profile row.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SEARCH_LIMITS = {
  starter: 20,
  growth: 50,
  pro: 150,
};

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, searches_used")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to search for leads." },
      { status: 402 }
    );
  }

  const limit = SEARCH_LIMITS[plan];
  if (profile.searches_used >= limit) {
    return NextResponse.json(
      {
        error: "search_limit",
        message: `You've used all ${limit} lead searches for this month. Upgrade for more.`,
      },
      { status: 402 }
    );
  }

  const { location, category } = await req.json();
  if (!location || !category) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  try {
    const placesRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.id",
        },
        body: JSON.stringify({
          textQuery: `${category} in ${location}`,
          maxResultCount: 20,
        }),
      }
    );

    const data = await placesRes.json();

    if (!placesRes.ok) {
      throw new Error(data?.error?.message || "Google Places API error");
    }

    // Only keep businesses that have no website listed — those are the leads.
    const leads = (data.places || [])
      .filter((p) => !p.websiteUri)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text || "Unknown business",
        address: p.formattedAddress || "",
        phone: p.nationalPhoneNumber || "",
      }));

    await supabaseAdmin
      .from("profiles")
      .update({ searches_used: profile.searches_used + 1 })
      .eq("id", user.id);

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Lead search failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
