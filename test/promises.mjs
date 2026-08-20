// What the website promises, checked against what the code does.
//
// Two of these had already drifted and nobody noticed, because nothing
// compares a sentence on a marketing page with the route that has to
// honour it:
//
//   - The pricing page said editing is "unlimited and free". /api/edit
//     charged a generation and refused once the month's allowance was
//     gone, so a Starter customer with five sites could not fix a typo.
//   - The FAQ said custom domains are Growth and Pro. /api/connect-domain
//     checked only that you owned the project.
//
// This file reads the real source and fails if either drifts back.
//
//   node test/promises.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { PLAN_LIMITS, canUseCustomDomain, canUseReceptionist, numbersAllowed } from "../lib/plans.js";

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
const editRoute = read("../app/api/edit/route.js");
const domainRoute = read("../app/api/connect-domain/route.js");
const pricing = read("../app/pricing/page.js");
const receptionistRoute = read("../app/api/receptionist/route.js");
const faqs = read("../lib/faqs.ts");

console.log('\n"Editing a site afterwards is unlimited and free"');
{
  check("the pricing page still makes that promise", () =>
    assert.match(pricing, /Editing a site afterwards is unlimited and free/));
  check("the edit route does not spend a generation", () =>
    assert.ok(!/generations_used:\s*profile\.generations_used\s*\+/.test(editRoute), editRoute.slice(0, 0) || "edit route increments generations_used"));
  check("and does not refuse once the allowance is gone", () =>
    assert.ok(!/generation_limit/.test(editRoute), "edit route still enforces the generation limit"));
  check("it still requires a plan", () => assert.match(editRoute, /no_plan/));
}

console.log("\n“Growth and Pro plans let you connect any domain”");
{
  check("the FAQ still says Growth and Pro", () =>
    assert.match(faqs, /Growth and Pro plans let you connect any domain/));
  check("the route enforces it", () => assert.match(domainRoute, /canUseCustomDomain/));
  check("trial and starter cannot", () => {
    assert.strictEqual(canUseCustomDomain("trial"), false);
    assert.strictEqual(canUseCustomDomain("starter"), false);
    assert.strictEqual(canUseCustomDomain("none"), false);
  });
  check("growth and pro can", () => {
    assert.strictEqual(canUseCustomDomain("growth"), true);
    assert.strictEqual(canUseCustomDomain("pro"), true);
  });
  check("an unknown plan is refused rather than allowed", () => {
    assert.strictEqual(canUseCustomDomain(undefined), false);
    assert.strictEqual(canUseCustomDomain("enterprise-typo"), false);
  });
  check("only the plans whose card lists the feature have it", () => {
    // "Custom domain for every client" appears on the Growth card, and
    // Pro inherits it via "Everything in Growth".
    assert.match(pricing, /Custom domain for every client/);
    const paidWithDomains = Object.entries(PLAN_LIMITS)
      .filter(([, v]) => v.customDomains)
      .map(([k]) => k);
    assert.deepStrictEqual(paidWithDomains.sort(), ["growth", "pro"]);
  });
}

console.log('\n"AI receptionist — N phone lines" on every paid card');
{
  // Each line is a real phone number rented from Twilio every month, paid
  // by Sitebric whether it ever rings or not. So the card promises a
  // count, not a feature flag, and the count has to be the one the route
  // enforces.
  check("the pricing card states a line count", () =>
    assert.match(pricing, /AI receptionist — \$\{PLAN_LIMITS\[plan\]\.numbers\} phone lines/));
  check("it is read from PLAN_LIMITS rather than typed out", () =>
    assert.ok(!/receptionist[^\n]*\b(3|10|25)\b\s*phone lines/.test(pricing),
      "a line count is hardcoded on the pricing page"));
  check("the route enforces the same allowance", () => {
    assert.match(receptionistRoute, /numbersAllowed/);
    assert.match(receptionistRoute, /count \|\| 0\) >= allowance/);
  });
  check("every paid plan gets lines", () => {
    for (const plan of ["starter", "growth", "pro"]) {
      assert.strictEqual(canUseReceptionist(plan), true, plan);
      assert.ok(numbersAllowed(plan) > 0, plan);
    }
  });
  check("more lines the higher the plan", () => {
    assert.ok(numbersAllowed("starter") < numbersAllowed("growth"));
    assert.ok(numbersAllowed("growth") < numbersAllowed("pro"));
  });
  check("the free trial gets none — it gets the demo line instead", () => {
    assert.strictEqual(numbersAllowed("trial"), 0);
    assert.strictEqual(canUseReceptionist("trial"), false);
    assert.strictEqual(canUseReceptionist("none"), false);
    assert.strictEqual(canUseReceptionist(undefined), false);
  });
  check("and the trial card therefore promises no lines", () => {
    const withLines = Object.entries(PLAN_LIMITS)
      .filter(([, v]) => v.numbers > 0)
      .map(([k]) => k);
    assert.deepStrictEqual(withLines.sort(), ["growth", "pro", "starter"]);
  });
  check("a plan-less account is pointed at the demo, not just refused", () =>
    assert.match(receptionistRoute, /Ring the demo number/));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
