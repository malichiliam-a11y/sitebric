import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  starter: "price_1U08TIFnYMPDeqfeHune9w37",
  growth: "price_1U08U6FnYMPDeqfeQaka6lO1",
  pro: "price_1U08UrFnYMPDeqfeSY0pbFFd",
};

export async function POST(req) {
  try {
    const { plan } = await req.json();
    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const origin = req.headers.get("origin");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
