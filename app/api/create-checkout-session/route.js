import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { priceIdFor } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
