import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { PRICE_IDS } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const origin = req.headers.get("origin");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { plan, user_id: user.id },
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
