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

// Reverse lookup used by the Stripe webhook: when someone switches plans
// from the billing portal, the event only tells us the new price id.
export function planForPriceId(priceId) {
  return Object.keys(PRICE_IDS).find((plan) => PRICE_IDS[plan] === priceId) || null;
}
