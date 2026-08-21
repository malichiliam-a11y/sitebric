// The cancellation path, checked against the real source.
//
// The rules here are each one line of code in a route, and each one is
// invisible when it goes missing — the tests still pass, the build is
// clean, and the only symptom is money leaking or a business going dark.
// So this file reads the routes themselves and fails if a rule is gone.
//
//   node test/serving-gate.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { offlinePage } from "../lib/offline-page.js";
import { GRACE_DAYS, NUMBER_RELEASE_DAYS } from "../lib/entitlements.js";

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
const slugRoute = read("../app/s/[id]/route.js");
const domainRoute = read("../app/api/custom-domain-site/route.js");
const voiceRoute = read("../app/api/voice/incoming/route.js");
const reclaim = read("../app/api/cron/reclaim/route.js");
const webhook = read("../app/api/stripe-webhook/route.js");

console.log("\nA cancelled account's sites stop being served");
{
  for (const [name, src] of [["/s/[id]", slugRoute], ["custom domain", domainRoute]]) {
    check(`${name} looks up who owns the site`, () =>
      assert.match(src, /select\([^)]*user_id/));
    check(`${name} asks whether that owner is still entitled`, () =>
      assert.match(src, /ownerServiceState\(\s*project\.user_id\s*\)/));
    // Written out in full rather than with a loose wildcard: the nested
    // call is the point, and a pattern lax enough to match anything would
    // still pass if the gate were replaced with a constant.
    check(`${name} refuses to serve when they are not`, () =>
      assert.match(
        src,
        /if \(!sitesServe\(await ownerServiceState\(project\.user_id\)\)\) return offline\(\);/
      ));
  }
}

console.log("\nThe offline page protects the business, not us");
{
  const res = offlinePage();
  check("503, never 404 — a 404 would drop them from Google", () =>
    assert.strictEqual(res.status, 503));
  check("it tells crawlers to come back", () =>
    assert.strictEqual(res.headers["Retry-After"], "86400"));
  check("it is never cached, so paying up brings the site straight back", () =>
    assert.match(res.headers["Cache-Control"] || "", /no-store/));

  const html = read("../lib/offline-page.js");
  check("noindex while it is down", () => assert.match(html, /noindex/));
  check("it does not shame the business in front of its customers", () => {
    for (const word of ["unpaid", "suspended", "cancelled", "canceled", "overdue", "billing"]) {
      assert.ok(
        !new RegExp(word, "i").test(html.split("export function offlinePage")[1] || ""),
        `the offline page says "${word}" to the public`
      );
    }
  });
  check("and does not advertise at them either", () =>
    assert.ok(!/sitebric/i.test(html.split("export function offlinePage")[1] || ""),
      "the offline page names Sitebric to a stranger"));
}

console.log("\nThe receptionist stops answering — without stranding callers");
{
  check("it checks the owner's standing", () =>
    assert.match(voiceRoute, /receptionistAnswers\(await ownerServiceState\(number\.user_id\)\)/));
  check("the public demo line is exempt", () =>
    assert.match(voiceRoute, /!number\.is_demo && !receptionistAnswers/));
  check("a lapsed line still forwards to the business rather than hanging up", () => {
    const block = voiceRoute.slice(voiceRoute.indexOf("!number.is_demo && !receptionistAnswers"));
    const guard = block.slice(0, block.indexOf("// The demo line is public"));
    assert.match(guard, /number\.forward_to/);
    assert.match(guard, /sayAndDial/);
  });
}

console.log("\nMoney stops leaking, and only after it is safe");
{
  check("cancelling records when it happened", () =>
    assert.match(webhook, /plan:\s*"none",\s*plan_ended_at:\s*new Date\(\)\.toISOString\(\)/));
  check("coming back clears it", () =>
    assert.match(webhook, /plan_ended_at:\s*null/));
  check("the reclaim cron is authenticated", () =>
    assert.match(reclaim, /CRON_SECRET/));
  check("an unconfigured deployment refuses rather than exposing it", () =>
    assert.match(reclaim, /!process\.env\.CRON_SECRET[\s\S]{0,120}503/));
  check("the decision comes from the shared module, not from SQL alone", () =>
    assert.match(reclaim, /numberDueForRelease\(/));
  check("the demo line is never reclaimed", () =>
    assert.match(reclaim, /\.eq\("is_demo",\s*false\)/));
  check("Twilio is told first, so a number cannot bill with no row behind it", () => {
    const i = reclaim.indexOf("releaseNumber(number.twilio_sid)");
    const j = reclaim.indexOf(".delete()");
    assert.ok(i > -1 && j > -1 && i < j, "the row is deleted before the number is released");
  });
  check("a failed release does not delete the row", () =>
    assert.match(reclaim, /if \(!result\.released\)[\s\S]{0,160}continue;/));
}

console.log("\nThe irreversible step waits the longest");
{
  check("numbers outlive the sites by weeks", () =>
    assert.ok(NUMBER_RELEASE_DAYS >= GRACE_DAYS * 5,
      `${NUMBER_RELEASE_DAYS}d release vs ${GRACE_DAYS}d grace — too close`));
  check("the cron is actually scheduled", () => {
    const vercel = JSON.parse(read("../vercel.json"));
    assert.ok((vercel.crons || []).some((c) => c.path === "/api/cron/reclaim"),
      "reclaim is not in vercel.json, so it would never run");
  });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
