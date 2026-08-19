// A script is a promise about what a stranger hears on the phone. The
// checks that matter are the ones about honesty: the script must never
// put a claim in the caller's mouth that nobody has verified.
//
//   node test/lead-script.mjs

import assert from "node:assert";
import { leadScript, singular } from "../lib/lead-script.js";
import { leadsToCsv, csvFilename } from "../lib/leads-csv.js";

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

console.log("\nsaying the trade out loud");
{
  const cases = [
    ["locksmiths", "locksmith"],
    ["plumbers", "plumber"],
    ["bakeries", "bakery"],
    ["car washes", "car wash"],
    ["hair salons", "hair salon"],
    ["dentists", "dentist"],
    ["restaurants", "restaurant"],
    ["barber shops", "barber shop"],
    ["gyms", "gym"],
    // Already singular — must survive untouched.
    ["auto glass", "auto glass"],
    ["business", "business"],
    ["landscaping", "landscaping"],
    ["hvac", "hvac"],
  ];
  for (const [input, want] of cases) {
    check(`"${input}" → "${want}"`, () => assert.strictEqual(singular(input), want));
  }
  check("empty stays empty", () => {
    assert.strictEqual(singular(""), "");
    assert.strictEqual(singular(null), "");
  });
}

const NO_SITE = { name: "Bob's Locks", hasWebsite: false, phone: "512-555-0100" };
const HAS_SITE = { name: "Ace Plumbing", hasWebsite: true, website: "https://ace.example" };
const OPTS = { category: "locksmiths", location: "Austin, TX" };

console.log("\nhonesty — the thing that loses the call");
{
  // We know from Google whether a site exists. We do NOT know whether it
  // is slow, dated, or ugly. If the script asserts any of that, the
  // caller is caught out the moment the owner opens their own site.
  const s = leadScript(HAS_SITE, { ...OPTS, category: "plumbers" });
  const spoken = s.call.map((c) => c.text).join(" ");
  check("never claims their existing site is bad", () => {
    assert.ok(!/out of date|outdated|looks terrible|hasn't been touched|too slow/i.test(spoken),
      `script asserts an unverified fault: ${spoken}`);
  });
  check("sends the caller to look at it first", () =>
    assert.match(s.prep.text, /open their website/i));
  check("leaves a blank for what they actually saw", () =>
    assert.match(spoken, /\[the one thing you wrote down\]/));

  const none = leadScript(NO_SITE, OPTS);
  check("the no-site script states only what Google shows", () =>
    assert.match(none.call[1].text, /no website on your listing/i));
  check("and does not tell them to inspect a site that isn't there", () =>
    assert.ok(!/open their website/i.test(none.prep.text)));
}

console.log("\nthe offer changes once the site exists");
{
  const before = leadScript(NO_SITE, OPTS);
  const after = leadScript(NO_SITE, { ...OPTS, built: true, link: "https://sitebric.com/s/bobs" });

  check("unbuilt offers to build it", () => assert.match(before.call[2].text, /I'll build you one/i));
  check("built says it already exists", () => assert.match(after.call[2].text, /already built it/i));
  check("built text carries the real link", () => assert.match(after.sms, /sitebric\.com\/s\/bobs/));
  check("unbuilt text has no fake link", () => assert.ok(!/\[the link\]/.test(before.sms)));
  check("built email subject differs", () =>
    assert.notStrictEqual(before.email.subject, after.email.subject));
}

console.log("\nplaceholders the reseller fills in");
{
  const s = leadScript(NO_SITE, OPTS);
  check("every blank uses one bracket style", () => {
    const brackets = s.full.match(/\[[^\]]+\]/g) || [];
    assert.ok(brackets.length >= 3, "expected fill-in blanks");
    // No stray {{mustache}} or %s left over from editing.
    assert.ok(!/\{\{|%s|\$\{/.test(s.full), s.full.slice(0, 200));
  });
  check("voicemail says the callback number twice", () => {
    const hits = s.voicemail.match(/\[your number\]/g) || [];
    assert.strictEqual(hits.length, 2);
  });
  check("no price is invented for them", () =>
    assert.ok(!/\$\d/.test(s.full)));
}

console.log("\nthe lead's own details reach the words");
{
  const s = leadScript(NO_SITE, OPTS);
  check("business name appears", () => assert.match(s.full, /Bob's Locks/));
  check("city appears", () => assert.match(s.full, /Austin, TX/));
  check("trade is singular where it's spoken", () =>
    assert.match(s.objections[4].a, /a locksmith/));
}

console.log("\nmissing input can't produce broken words");
{
  const s = leadScript({}, {});
  check("no undefined leaks into the script", () =>
    assert.ok(!/undefined|null|NaN/.test(s.full), s.full.slice(0, 300)));
  check("still produces a usable call", () => {
    assert.strictEqual(s.call.length, 4);
    assert.ok(s.voicemail.length > 40);
  });
  check("a pasted paragraph as a category can't become the script", () => {
    const long = leadScript({ name: "X" }, { category: "a".repeat(500), location: "b".repeat(500) });
    assert.ok(long.call[0].text.length < 400, "opener ran away");
  });
}

console.log("\ncsv — the file that opens in Excel");
{
  // A business name is a stranger's text. Excel runs a cell that starts
  // with = as a formula.
  const csv = leadsToCsv([
    { name: "=cmd|'/c calc'!A1", phone: "+1 512 555 0100", has_website: false },
    { name: "@SUM(1+1)", phone: "-2+3" },
    { name: "Bob's \"Best\" Locks, Inc", address: "1 Main St, Austin" },
  ]);

  check("a formula is neutralised", () => {
    for (const line of csv.split("\r\n").slice(1)) {
      if (!line.trim()) continue;
      const first = line.startsWith('"') ? line.slice(1) : line;
      assert.ok(!/^[=+\-@]/.test(first), `formula reached a cell: ${line}`);
    }
  });
  check("every dangerous prefix is covered", () => {
    assert.ok(csv.includes("'=cmd"));
    assert.ok(csv.includes("'@SUM"));
    assert.ok(csv.includes("'-2+3"));
  });
  check("quotes and commas survive intact", () =>
    assert.ok(csv.includes('"Bob\'s ""Best"" Locks, Inc"')));
  check("has a header row", () => assert.match(csv.split("\r\n")[0], /Business/));
  check("carries a BOM so Excel reads UTF-8", () => assert.ok(csv.startsWith("﻿")));
  check("boolean renders as words, not true/false", () => assert.ok(/,no,/.test(csv)));
  check("empty list is still a valid file", () => {
    const empty = leadsToCsv([]);
    assert.strictEqual(empty.split("\r\n").filter(Boolean).length, 1);
    assert.deepStrictEqual(leadsToCsv(null).length, empty.length);
  });
  check("filename is dated", () => assert.match(csvFilename(new Date("2026-08-19")), /2026-08-19\.csv$/));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
