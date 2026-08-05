import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  try {
    // Cancel any live subscription first. The profile row below is the
    // only record of their Stripe subscription id, so deleting it before
    // cancelling would leave them being billed with nothing left to
    // trace it back to.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (err) {
        // An already-cancelled or missing subscription shouldn't block
        // the deletion the user asked for.
        console.error("Subscription cancel during account deletion failed:", err.message);
      }
    }

    const { error: projectsError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", user.id);

    if (projectsError) throw new Error(projectsError.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) throw new Error(profileError.message);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authError) throw new Error(authError.message);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Account deletion failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
