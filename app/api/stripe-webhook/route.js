import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isOwner } from "@/lib/admin";
import { planForPriceId } from "@/lib/plans";
import { maybeGrantReferralReward } from "@/lib/referral-reward";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Uses the service role key so this route can write to any user's
// profile row, bypassing row-level security (safe here since this
// endpoint only trusts data verified by Stripe's signature check below).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


// Sitebric's own account is not a customer, and Stripe must not decide
// what it can do.
//
// The owner cancelled their subscription while testing, which meant
// customer.subscription.deleted was going to fire at period end and set
// plan to "none" — locking the owner out of their own product, weeks
// later, with no obvious cause. Any fix that lives only in the profiles
// row loses to this webhook eventually; the guard has to be here.
async function ownsThisCustomer(customerId) {
  if (!customerId) return false;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (!profile) return false;

    const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    return isOwner(data?.user?.email);
  } catch (err) {
    // Fail open on the plan write rather than swallowing a real
    // customer's upgrade because a lookup hiccuped.
    console.error("ownsThisCustomer failed:", err?.message);
    return false;
  }
}

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            generations_used: 0,
            searches_used: 0,
            // Coming back clears the lapse, which is what brings their
            // clients' sites and receptionist lines straight back up.
            // Nothing was deleted, so this is the whole restore.
            plan_ended_at: null,
          });

          // The moment this user became a paying subscriber, not before —
          // this is the only point that can trigger the referrer's $5,
          // so it can't be farmed with throwaway accounts that never pay.
          try {
            await maybeGrantReferralReward(supabaseAdmin, userId);
          } catch (rewardErr) {
            console.error("Referral reward check failed:", rewardErr.message);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Renewal — reset the monthly generation counter.
        //
        // Only a real renewal. Changing plan mid-month now bills the
        // difference immediately, which produces an invoice too, and
        // resetting on that would hand out a fresh month of generations
        // for every plan switch — a Starter who burned all ten could
        // upgrade and downgrade to get ten more for the proration
        // difference. "subscription_cycle" is the billing reason Stripe
        // uses for the periodic charge and nothing else.
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (invoice.billing_reason === "subscription_cycle") {
          await supabaseAdmin
            .from("profiles")
            .update({ generations_used: 0, searches_used: 0 })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      case "customer.subscription.updated": {
        // Plan switches made from the Stripe billing portal only show up
        // here — without this, someone who upgrades keeps their old
        // plan's limits (and someone who downgrades keeps the higher
        // ones) because nothing else writes the new plan back.
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = planForPriceId(priceId);

        if (plan && !(await ownsThisCustomer(subscription.customer))) {
          await supabaseAdmin
            .from("profiles")
            .update({
              plan,
              stripe_subscription_id: subscription.id,
              // A live subscription on a recognised price is proof they
              // are paying, whatever happened before it.
              plan_ended_at: null,
            })
            .eq("stripe_customer_id", subscription.customer);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (!(await ownsThisCustomer(customerId))) {
          // The timestamp is the whole point. Setting plan='none' alone
          // told nothing downstream WHEN this happened, so every
          // published site stayed live forever on a cancelled account and
          // every receptionist number kept renting from Twilio against no
          // revenue at all. lib/entitlements.js measures both grace
          // periods from here.
          //
          // Note this fires for a declined or expired card as well as a
          // deliberate cancellation — which is exactly why the grace
          // period isn't zero.
          await supabaseAdmin
            .from("profiles")
            .update({ plan: "none", plan_ended_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
