// Upgrading must change the subscription you already have, not sell you
// a second one.
//
// This is not a hypothetical. Two days after the pricing page shipped, a
// real customer paid $15 for Starter, upgraded to Growth, and was billed
// for both at once — the checkout route passed customer_email with no
// customer, so Stripe minted a fresh customer every time and had no way
// to see the subscription already running. They noticed the double charge
// and cancelled the old one themselves.
//
// Upgrades are where the revenue is, so this is the one path that must
// not rot. These are source assertions rather than live Stripe calls:
// the failure was a missing argument, and a missing argument is visible
// in the file.
//
//   node test/plan-change.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const route = read("../app/api/create-checkout-session/route.js");
const webhook = read("../app/api/stripe-webhook/route.js");
const dashboard = read("../app/dashboard/dashboard-client.js");

console.log("\nAn existing subscriber changes plan in place");
{
  check("it looks for a subscription before selling one", () =>
    assert.match(route, /stripe\.subscriptions\.list/));
  check("it finds that subscription by customer, not by a stored id", () => {
    // The stored subscription id goes stale; the customer is the durable
    // handle, and a stale id is exactly how a second subscription gets
    // sold to somebody who already has one.
    assert.match(route, /subscriptions\.list\(\{[\s\S]{0,120}customer: customerId/);
  });
  check("it updates the subscription rather than opening a checkout", () =>
    assert.match(route, /stripe\.subscriptions\.update\(/));
  check("the change is prorated and billed immediately", () =>
    assert.match(route, /proration_behavior:\s*"always_invoice"/));
  check("choosing a plan clears a pending cancellation", () =>
    assert.match(route, /cancel_at_period_end:\s*false/));
  check("picking the plan you already have is refused, not charged", () =>
    assert.match(route, /already_on_plan/));
}

console.log("\nCheckout never mints a second customer for the same person");
{
  check("a known customer is reused", () =>
    assert.match(route, /customerId \? \{ customer: customerId \}/));
  check("customer_email is only the fallback for a brand-new customer", () => {
    // Stripe rejects both together, and passing the email alone is what
    // created a new customer record on every single purchase.
    const line = route.split("\n").find((l) => l.includes("customer_email"));
    assert.ok(line, "customer_email is gone entirely");
    assert.ok(
      /customerId \?/.test(line),
      `customer_email is passed unconditionally: ${line.trim()}`
    );
  });
}

console.log("\nA plan switch does not hand out a free month of generations");
{
  // Billing the difference immediately produces an invoice, and the
  // renewal handler resets the monthly counters on invoices. Without a
  // guard, a Starter who burned all ten generations could upgrade and
  // downgrade to get ten more for the proration difference.
  check("the counter reset is gated on a real renewal", () =>
    assert.match(webhook, /billing_reason === "subscription_cycle"/));
  check("the reset is inside that guard, not beside it", () => {
    const start = webhook.indexOf('case "invoice.payment_succeeded"');
    const end = webhook.indexOf("case ", start + 10);
    const block = webhook.slice(start, end);
    const guard = block.indexOf('billing_reason === "subscription_cycle"');
    const reset = block.indexOf("generations_used: 0");
    assert.ok(guard !== -1 && reset !== -1, "block is missing the guard or the reset");
    assert.ok(reset > guard, "the reset runs before the renewal check");
  });
}

console.log("\nThe customer is told what happened");
{
  check("the route sends them somewhere that says so", () =>
    assert.match(route, /planChanged=/));
  check("the dashboard reads that marker", () =>
    assert.match(dashboard, /params\.get\("planChanged"\)/));
  check("and clears it so a refresh doesn't announce it twice", () =>
    assert.match(dashboard, /params\.delete\("planChanged"\)/));
  check("the wording says only the difference was charged", () =>
    assert.match(dashboard, /only charged the\s*\n?\s*difference/));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
