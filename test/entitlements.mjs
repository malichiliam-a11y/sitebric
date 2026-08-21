// What keeps working after the money stops, and what doesn't.
//
// The rule this file exists to protect: this module FAILS OPEN. Every
// uncertain input has to keep serving, because the alternative is taking
// a paying customer's client's website and phone line offline by mistake.
// If someone "tidies" one of these into a fail-closed default, a real
// business goes dark and we find out from the reseller who is paying us.
//
//   node test/entitlements.mjs

import assert from "node:assert";
import {
  GRACE_DAYS,
  NUMBER_RELEASE_DAYS,
  serviceState,
  sitesServe,
  receptionistAnswers,
  numberDueForRelease,
  daysOfGraceLeft,
  lapsedNotice,
} from "../lib/entitlements.js";

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

const NOW = new Date("2026-08-20T12:00:00Z");
const ago = (days) => new Date(NOW.getTime() - days * 86400000);

console.log("\nPaying and trialling accounts are untouched");
{
  for (const plan of ["starter", "growth", "pro"]) {
    check(`${plan} is active`, () =>
      assert.strictEqual(serviceState({ plan, now: NOW }), "active"));
  }
  check("the free trial is active too — its limit is generations, not a clock", () =>
    assert.strictEqual(serviceState({ plan: "trial", now: NOW }), "active"));
  check("a stale end date cannot lapse a paying account", () =>
    // Resubscribing clears the column, but if a write is ever missed the
    // live plan has to win — otherwise a returning customer's sites stay
    // dark while they are paying again.
    assert.strictEqual(
      serviceState({ plan: "growth", planEndedAt: ago(400), now: NOW }),
      "active"
    ));
}

console.log("\nThe grace window");
{
  check("just cancelled — still serving", () =>
    assert.strictEqual(serviceState({ plan: "none", planEndedAt: NOW, now: NOW }), "grace"));
  check("the day before the deadline — still serving", () =>
    assert.strictEqual(
      serviceState({ plan: "none", planEndedAt: ago(GRACE_DAYS - 0.5), now: NOW }),
      "grace"
    ));
  check("the moment it runs out — expired", () =>
    assert.strictEqual(
      serviceState({ plan: "none", planEndedAt: ago(GRACE_DAYS), now: NOW }),
      "expired"
    ));
  check("sites and the receptionist both survive grace", () => {
    assert.strictEqual(sitesServe("grace"), true);
    assert.strictEqual(receptionistAnswers("grace"), true);
  });
  check("and both stop once expired", () => {
    assert.strictEqual(sitesServe("expired"), false);
    assert.strictEqual(receptionistAnswers("expired"), false);
  });
  check("the countdown counts down", () => {
    assert.strictEqual(daysOfGraceLeft({ planEndedAt: NOW, now: NOW }), GRACE_DAYS);
    assert.strictEqual(daysOfGraceLeft({ planEndedAt: ago(GRACE_DAYS), now: NOW }), 0);
    assert.strictEqual(daysOfGraceLeft({ planEndedAt: ago(99), now: NOW }), 0);
  });
}

console.log("\nIt fails OPEN — every unclear case keeps serving");
{
  // Each of these would take a real business offline if it resolved the
  // other way, and none of them is evidence that anyone stopped paying.
  const openCases = [
    ["no plan and no end date", { plan: "none" }],
    ["a null plan", { plan: null, planEndedAt: null }],
    ["undefined everything", {}],
    ["a plan string nobody recognises", { plan: "enterprise-typo" }],
    ["an unparseable end date", { plan: "none", planEndedAt: "not a date" }],
    ["an empty-string end date", { plan: "none", planEndedAt: "" }],
    ["an end date in the future — clock skew, not a lapse", {
      plan: "none",
      planEndedAt: new Date(NOW.getTime() + 86400000),
    }],
  ];
  for (const [name, input] of openCases) {
    check(name, () =>
      assert.strictEqual(serviceState({ ...input, now: NOW }), "active"));
  }
  check("plan matching ignores case and stray whitespace", () => {
    assert.strictEqual(serviceState({ plan: "  Pro  ", now: NOW }), "active");
    assert.strictEqual(serviceState({ plan: "GROWTH", now: NOW }), "active");
  });
}

console.log("\nReleasing a number — the one irreversible step");
{
  check("never while the plan is live", () =>
    assert.strictEqual(
      numberDueForRelease({ plan: "starter", planEndedAt: ago(999), now: NOW }),
      false
    ));
  check("never without an end date", () =>
    assert.strictEqual(numberDueForRelease({ plan: "none", now: NOW }), false));
  check("not during grace", () =>
    assert.strictEqual(
      numberDueForRelease({ plan: "none", planEndedAt: ago(1), now: NOW }),
      false
    ));
  check("not merely because the site went dark", () =>
    assert.strictEqual(
      numberDueForRelease({ plan: "none", planEndedAt: ago(GRACE_DAYS + 1), now: NOW }),
      false
    ));
  check("only after the full release window", () => {
    assert.strictEqual(
      numberDueForRelease({ plan: "none", planEndedAt: ago(NUMBER_RELEASE_DAYS - 1), now: NOW }),
      false
    );
    assert.strictEqual(
      numberDueForRelease({ plan: "none", planEndedAt: ago(NUMBER_RELEASE_DAYS), now: NOW }),
      true
    );
  });
  check("the wait is much longer than the grace period", () =>
    assert.ok(NUMBER_RELEASE_DAYS > GRACE_DAYS * 5,
      "a number can be released too soon after the sites go dark"));
}

console.log("\nWhat the dashboard is told");
{
  check("a paying account is told nothing", () =>
    assert.strictEqual(lapsedNotice({ plan: "pro", now: NOW }), null));
  check("during grace it names the deadline", () => {
    const n = lapsedNotice({ plan: "none", planEndedAt: ago(1), now: NOW });
    assert.strictEqual(n.state, "grace");
    assert.match(n.title, /go offline in 2 days/);
  });
  check("on the last day it says tomorrow, not '1 days'", () => {
    const n = lapsedNotice({ plan: "none", planEndedAt: ago(GRACE_DAYS - 0.5), now: NOW });
    assert.match(n.title, /tomorrow/);
  });
  check("once expired it says so in the present tense", () => {
    const n = lapsedNotice({ plan: "none", planEndedAt: ago(10), now: NOW });
    assert.strictEqual(n.state, "expired");
    assert.match(n.title, /are offline/);
  });
  check("and promises nothing was deleted, because nothing was", () => {
    const n = lapsedNotice({ plan: "none", planEndedAt: ago(10), now: NOW });
    assert.match(n.body, /Nothing has been deleted/);
    assert.match(n.body, /comes back/);
  });
  check("it warns that releasing a number is the part that can't be undone", () => {
    const n = lapsedNotice({ plan: "none", planEndedAt: ago(10), now: NOW });
    assert.match(n.body, new RegExp(`${NUMBER_RELEASE_DAYS} days`));
    assert.match(n.body, /can't be undone/);
  });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
