import { createClient } from "@supabase/supabase-js";
import { serviceState } from "./entitlements.js";

// Looks up whether a site's owner is still entitled to have it served.
//
// Separate from lib/entitlements.js so that module stays pure and
// testable without a database. This is the only part that needs one.
//
// Uses the service role because the answer lives in the site owner's
// profile row, and RLS quite rightly stops an anonymous visitor reading
// somebody else's profile. Nothing about the profile is returned — only
// the verdict travels, never the plan or the billing details.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * "active" | "grace" | "expired" for whoever owns this row.
 *
 * Any failure returns "active". A visitor is looking at a real business's
 * website right now; a database hiccup must not be what takes it down.
 * See the note at the top of lib/entitlements.js — the whole path fails
 * open on purpose.
 */
export async function ownerServiceState(userId) {
  if (!userId) return "active";
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("plan, plan_ended_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return "active";
    return serviceState({ plan: data.plan, planEndedAt: data.plan_ended_at });
  } catch (err) {
    console.error("ownerServiceState failed:", err?.message);
    return "active";
  }
}
