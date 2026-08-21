import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { priceIdFor, planForPriceId } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Writing the plan back needs the service role: a user may not edit their
// own plan row, and the value here is one Stripe has already confirmed.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// A subscription we are allowed to change in place.
//
// Read from Stripe by customer rather than from the stored subscription
// id, because the stored one can be stale — and a stale id is exactly how
// a second subscription gets sold to someone who already has one.
const CHANGEABLE = ["active", "trialing", "past_due"];

async function currentSubscription(customerId) {
  if (!customerId) return null;
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return (
    subs.data
      .filter((s) => CHANGEABLE.includes(s.status))
      // Newest first. A customer should only ever have one, but if an
      // older duplicate is still winding down we must not edit that one.
      .sort((a, b) => b.created - a.created)[0] || null
  );
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Signalled so the pricing page can send them to sign in and pick
      // the same plan back up afterwards, rather than showing a dead end.
      return NextResponse.json(
        { error: "not_authenticated", message: "Create a free account to subscribe." },
        { status: 401 }
      );
    }

    const { plan, interval } = await req.json();

    // Defaults to monthly, so an older client that doesn't send an
    // interval keeps working exactly as it did.
    const priceId = priceIdFor(plan, interval || "month");

    if (!priceId) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    // Origin is absent on some requests, and a missing one silently
    // produced "null/dashboard" as the return URL.
    const origin = req.headers.get("origin") || SITE_URL;

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.stripe_customer_id || null;

    // ---- Already subscribed: change the plan they have. ----
    //
    // This used to open a fresh checkout every time, which creates a new
    // Stripe customer and therefore a SECOND subscription running
    // alongside the first. It happened to a real customer two days after
    // this shipped: they paid $15 for Starter, upgraded to Growth, and
    // were billed for both — they spotted it and cancelled the old one
    // themselves. Upgrading is where the revenue is, and it was the one
    // action the product punished.
    const existing = await currentSubscription(customerId);

    if (existing) {
      const item = existing.items?.data?.[0];

      if (!item) {
        // A subscription with no line item is not something to guess at.
        return NextResponse.json(
          { error: "no_item", message: "Couldn't read your current plan. Message me and I'll sort it." },
          { status: 409 }
        );
      }

      if (item.price?.id === priceId && !existing.cancel_at_period_end) {
        return NextResponse.json(
          { error: "already_on_plan", message: `You're already on ${plan}.` },
          { status: 409 }
        );
      }

      // always_invoice bills the difference now rather than parking it on
      // the next invoice, so the charge lands next to the click that
      // caused it. Stripe credits the unused part of the old plan, so an
      // upgrade mid-month costs the difference, not a second full price.
      //
      // cancel_at_period_end is cleared deliberately: picking a new plan
      // is re-committing, and leaving a pending cancellation on it would
      // quietly end the subscription they just chose.
      const updated = await stripe.subscriptions.update(existing.id, {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
        metadata: { plan, user_id: user.id, interval: interval || "month" },
      });

      // Written here as well as from the webhook. The webhook is the
      // authority, but it can land after the redirect, and a customer who
      // just paid to upgrade must not arrive at a dashboard still showing
      // the old plan.
      const confirmed = planForPriceId(updated.items?.data?.[0]?.price?.id) || plan;
      await supabaseAdmin
        .from("profiles")
        .update({ plan: confirmed, stripe_subscription_id: updated.id })
        .eq("id", user.id);

      // Returned as a url because both callers redirect on one; a plan
      // change that returned something else read as an error to them.
      return NextResponse.json({
        url: `${origin}/dashboard?planChanged=${encodeURIComponent(confirmed)}`,
        changed: true,
        plan: confirmed,
      });
    }

    // ---- No subscription yet: normal checkout. ----
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      // Reuse the customer when we already know it. Passing an email
      // instead makes Stripe mint a brand-new customer record every time,
      // which is how one person ended up as several customers.
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      metadata: { plan, user_id: user.id, interval: interval || "month" },
      // Shows the "Add promotion code" box at checkout. Who a code applies
      // to is controlled in Stripe (redemption limits, customer or price
      // restrictions), deliberately not here — special-casing an email in
      // this file would publish it, since this repository is public.
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout/plan change failed:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
