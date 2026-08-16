import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { limitsFor } from "@/lib/plans";
import { sanitizeCountryCode, sanitizeLanguageCode } from "@/lib/countries";

// Used only to increment searches_used — bypasses RLS since users
// don't have update permission on their own profile row.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetching up to 3 pages with required delays between them can take
// several seconds — give it more room than the default timeout.
export const maxDuration = 30;

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("plan, searches_used")
    .eq("id", user.id)
    .single();

  // Brand new users have no profile row yet — give them a free trial
  // instead of blocking immediately. If the generate route already
  // created a trial row for them, this just reuses it.
  if (!profile) {
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan: "trial",
      generations_used: 0,
      searches_used: 0,
    });
    profile = { plan: "trial", searches_used: 0 };
  }

  const plan = profile.plan;
  if (!plan || plan === "none") {
    return NextResponse.json(
      { error: "no_plan", message: "Subscribe to a plan to search for leads." },
      { status: 402 }
    );
  }

  const limit = limitsFor(plan).searches;
  if (profile.searches_used >= limit) {
    const message =
      plan === "trial"
        ? "You've used your 2 free lead searches. Subscribe to a plan to keep searching."
        : `You've used all ${limit} lead searches for this month. Upgrade for more.`;
    return NextResponse.json({ error: "search_limit", message }, { status: 402 });
  }

  const { location, category, country, language } = await req.json();
  if (!location || !category) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Without a regionCode an ambiguous city resolves by global prominence
  // rather than by who is asking — a reseller in England searching
  // "Manchester" could be handed Manchester, New Hampshire. The user's own
  // choice wins; Vercel's geo header is the fallback when they haven't
  // touched the picker. Both are untrusted input, so both are validated
  // against the ISO list before going anywhere near Google.
  const regionCode =
    sanitizeCountryCode(country) || sanitizeCountryCode(req.headers.get("x-vercel-ip-country"));

  // Google returns English whenever no language is given, regardless of
  // where the businesses actually are.
  const languageCode = sanitizeLanguageCode(language);

  try {
    let allPlaces = [];
    let pageToken = null;
    let pagesFetched = 0;

    do {
      const body = {
        textQuery: `${category} in ${location}`,
        maxResultCount: 20,
      };
      if (regionCode) body.regionCode = regionCode;
      if (languageCode) body.languageCode = languageCode;
      if (pageToken) body.pageToken = pageToken;

      const placesRes = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
            // internationalPhoneNumber carries the country code, which the
            // national format drops — the only version that still works
            // when the reseller and the business aren't in one country.
            "X-Goog-FieldMask":
              "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.id,places.googleMapsUri,nextPageToken",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await placesRes.json();

      if (!placesRes.ok) {
        throw new Error(data?.error?.message || "Google Places API error");
      }

      allPlaces = allPlaces.concat(data.places || []);
      pageToken = data.nextPageToken || null;
      pagesFetched++;

      // Google requires a short delay before a pageToken becomes valid.
      if (pageToken && pagesFetched < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } while (pageToken && pagesFetched < 3);

    // Everything found is returned, not just the businesses with no site.
    // Discarding the rest threw away most of a search: Google lists a
    // website for the large majority of businesses, so a 60-result search
    // collapsed to a handful of cards and sometimes one. A business with a
    // neglected site is still a lead — often a better one, since it has
    // already paid for a web presence once.
    //
    // The no-website ones stay at the top, so the easiest sell is still
    // what the reseller sees first.
    const leads = allPlaces
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text || "Unknown business",
        address: p.formattedAddress || "",
        // Shown in the local format a reseller recognises, dialled via the
        // international one so the tel: link works from anywhere.
        phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
        phoneDial: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
        mapsUrl: p.googleMapsUri || "",
        website: p.websiteUri || null,
        hasWebsite: Boolean(p.websiteUri),
      }))
      .sort((a, b) => Number(a.hasWebsite) - Number(b.hasWebsite));

    await supabaseAdmin
      .from("profiles")
      .update({ searches_used: profile.searches_used + 1 })
      .eq("id", user.id);

    return NextResponse.json({
      leads,
      total: leads.length,
      withoutWebsite: leads.filter((l) => !l.hasWebsite).length,
    });
  } catch (err) {
    console.error("Lead search failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
