import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { planForPriceId } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Uses the service role key so this route can write to any user's
// profile row, bypassing row-level security (safe here since this
// endpoint only trusts data verified by Stripe's signature check below).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Renewal — reset the monthly generation counter.
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await supabaseAdmin
          .from("profiles")
          .update({ generations_used: 0, searches_used: 0 })
          .eq("stripe_customer_id", customerId);
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

        if (plan) {
          await supabaseAdmin
            .from("profiles")
            .update({ plan, stripe_subscription_id: subscription.id })
            .eq("stripe_customer_id", subscription.customer);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await supabaseAdmin
          .from("profiles")
          .update({ plan: "none" })
          .eq("stripe_customer_id", customerId);
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
