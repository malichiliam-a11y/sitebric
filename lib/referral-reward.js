import Stripe from "stripe";
import { PLAN_PRICES } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const REWARD_CENTS = 500;

// Fires once, the moment a referred user actually becomes a paying
// subscriber — not on trial signup or trial usage, which costs nothing
// and would let anyone farm $5 credits for free by inviting throwaway
// accounts that never pay. Call this from the Stripe webhook right after
// a referred user's profile is updated to a paid plan (checkout.session
// .completed); it's cheap and safe to call from other spots too since it
// no-ops immediately once referral_reward_granted is true. Callers should
// wrap this in try/catch — a Stripe or DB hiccup here must never fail the
// request that triggered it.
export async function maybeGrantReferralReward(supabaseAdmin, userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("referred_by, referral_reward_granted, plan")
    .eq("id", userId)
    .single();

  if (!profile || !profile.referred_by || profile.referral_reward_granted) return;
  if (PLAN_PRICES[profile.plan] == null) return; // not on a paid plan yet

  const { data: referrer } = await supabaseAdmin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("referral_code", profile.referred_by)
    .maybeSingle();

  if (!referrer || referrer.id === userId) {
    // Unknown/stale code (e.g. the external "APEX" partner code, which
    // isn't a real user's referral_code) or a self-referral loophole —
    // either way there's no one to credit, so stop retrying.
    await supabaseAdmin.from("profiles").update({ referral_reward_granted: true }).eq("id", userId);
    return;
  }

  if (!referrer.stripe_customer_id) {
    // Referrer hasn't started billing yet — leave ungranted so this is
    // retried on the referred user's next generate/search call.
    return;
  }

  await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
    amount: -REWARD_CENTS,
    currency: "usd",
    description: "Sitebric referral reward — a friend you referred became an active user",
  });

  await supabaseAdmin.from("profiles").update({ referral_reward_granted: true }).eq("id", userId);
}
