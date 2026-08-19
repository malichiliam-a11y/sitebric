// The alert is only worth having if it fires on the error that actually
// happened. The credit message below is copied verbatim from the Vercel
// runtime log of the night generation was down for five hours.
//
//   node test/billing-alert.mjs

import assert from "node:assert";
import { isBillingFailure, friendlyGenerationError } from "../lib/generation-errors.js";

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

// Exactly what the Anthropic SDK threw, as it appeared in production.
const REAL_OUTAGE = new Error(
  `400 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."},"request_id":"req_011CeBH8bAKEw6ufYHcwxkoc"}`
);

console.log("\nthe error that actually happened");
{
  check("is recognised as a billing failure", () =>
    assert.strictEqual(isBillingFailure(REAL_OUTAGE), true));
  check("still shows the visitor the safe message", () =>
    assert.match(friendlyGenerationError(REAL_OUTAGE), /at capacity/i));
  check("never leaks the vendor's billing wording to the visitor", () => {
    const shown = friendlyGenerationError(REAL_OUTAGE);
    assert.ok(!/credit balance/i.test(shown));
    assert.ok(!/Plans & Billing/i.test(shown));
    assert.ok(!/Anthropic/i.test(shown));
  });
}

console.log("\nother billing shapes");
{
  for (const msg of [
    "Your credit balance is too low",
    "insufficient_quota",
    "billing hard limit reached",
    "payment required",
  ]) {
    check(`"${msg}" fires the alert`, () =>
      assert.strictEqual(isBillingFailure(new Error(msg)), true));
  }
}

console.log("\nwhat must NOT wake the owner at 3am");
{
  // These are transient or the user's own doing. Alerting on them would
  // train the owner to ignore the mail that matters.
  const notOurs = [
    "rate_limit_error: too many requests",
    "Overloaded",
    "The operation was aborted",
    "socket hang up",
    "multipage_shell_truncated",
    "fetch failed",
  ];
  for (const msg of notOurs) {
    check(`"${msg}" does not alert`, () =>
      assert.strictEqual(isBillingFailure(new Error(msg)), false));
  }

  const abort = new Error("aborted");
  abort.name = "AbortError";
  check("an abort does not alert", () => assert.strictEqual(isBillingFailure(abort), false));

  check("a missing message does not alert", () => {
    assert.strictEqual(isBillingFailure(undefined), false);
    assert.strictEqual(isBillingFailure({}), false);
    assert.strictEqual(isBillingFailure(new Error("")), false);
  });
}

console.log("\nthe two paths agree");
{
  // If these ever disagree the owner is told about outages that aren't
  // happening, or isn't told about the one that is.
  check("every billing failure also shows the capacity message", () => {
    for (const msg of ["credit balance too low", "insufficient quota", "payment failed"]) {
      const err = new Error(msg);
      assert.strictEqual(isBillingFailure(err), true);
      assert.match(friendlyGenerationError(err), /at capacity/i);
    }
  });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
