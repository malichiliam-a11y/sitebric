// Single source of truth for what each plan allows. Imported by the API
// routes that enforce these limits and by the dashboard that displays
// them, so the two can't drift apart.
export const PLAN_LIMITS = {
  none: { sites: 0, generations: 0, searches: 0, label: "No plan" },
  trial: { sites: 2, generations: 2, searches: 2, label: "Free Trial" },
  starter: { sites: 5, generations: 10, searches: 20, label: "Starter" },
  growth: { sites: 20, generations: 40, searches: 50, label: "Growth" },
  pro: { sites: 100, generations: 150, searches: 150, label: "Pro" },
};

// A multi-page site is one generation request that produces roughly three
// times the output of a single-page one, so it costs three generations
// rather than one. That keeps the unit economics identical no matter which
// kind of site someone builds: a Starter subscriber spending all 10
// generations costs about the same either way, whether that's 10 one-page
// sites or 3 multi-page ones.
//
// Deliberately a credit price rather than a plan gate: every paid plan can
// build one out of its normal allowance, so nobody has to upgrade a tier
// just to find out whether the feature is any good.
//
// The free trial's 2 generations are below this on purpose. A multi-page
// build costs real API money and the trial produces none, so a trial user
// sees the option priced at 3 and is told they have 2 — which is the
// upgrade prompt, not an accident.
export const MULTIPAGE_COST = 3;

// Switch for the four-page build. Off once already, after a single-call
// version took ~5 minutes of model streaming against a 300-second
// function limit: the platform killed the function with the site written
// but unsaved, and since output is billed the moment it's generated, each
// attempt cost real money and delivered nothing.
//
// Back on now that generation is split across parallel calls — shell plus
// home first, then the other three pages concurrently — and every call
// runs under an abort that fires well before the platform's ceiling, so a
// slow run stops itself instead of being killed mid-flight.
export const MULTIPAGE_ENABLED = false;

// What a generation request costs against the monthly allowance.
export function generationCost(multiPage) {
  return multiPage ? MULTIPAGE_COST : 1;
}

// Always returns a usable limits object. An unrecognised plan falls back
// to "none" (which blocks the action) rather than returning undefined and
// crashing the route that's about to read .generations off it.
export function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.none;
}

// Stripe price ids for each paid plan. Not secret — these are the same
// ids handed to Stripe Checkout in the browser.
export const PRICE_IDS = {
  starter: "price_1U08TIFnYMPDeqfeHune9w37",
  growth: "price_1U08U6FnYMPDeqfeQaka6lO1",
  pro: "price_1U08UrFnYMPDeqfeSY0pbFFd",
};

// Monthly price in cents for each paid plan, mirroring /pricing. Used to
// estimate MRR (e.g. for referral commissions) without an extra Stripe
// API call per subscriber. Update alongside the Stripe prices above.
//
// Note this is list price: a subscriber on a Stripe coupon is counted at
// full price here, so referral MRR reads high by the discount amount.
// Fixing that means asking Stripe for each subscription's real amount,
// which is a per-subscriber API call this page deliberately avoids.
export const PLAN_PRICES = {
  starter: 1500,
  growth: 2999,
  pro: 6999,
};

// Reverse lookup used by the Stripe webhook: when someone switches plans
// from the billing portal, the event only tells us the new price id.
export function planForPriceId(priceId) {
  return Object.keys(PRICE_IDS).find((plan) => PRICE_IDS[plan] === priceId) || null;
}
