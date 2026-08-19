// The parser decides what goes into an href on a live customer site, so
// the case that matters most is the one that must never get through:
// javascript: and data: URLs.
//
//   node test/order-links.mjs

import assert from "node:assert";
import { parseOrderLinks, orderLinksBlock } from "../lib/order-links.js";

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

console.log("\nplatform detection");
{
  const links = parseOrderLinks(`
    https://www.doordash.com/store/tacos-la-fondita-123456
    https://www.ubereats.com/store/tacos/abc
    https://www.grubhub.com/restaurant/tacos/999
    https://order.toasttab.com/online/tacos
    https://slicelife.com/restaurants/ny/brooklyn/pizza
  `);
  check("all five parsed", () => assert.strictEqual(links.length, 5));
  check("labels read off the hostname", () =>
    assert.deepStrictEqual(links.map((l) => l.label), [
      "DoorDash",
      "Uber Eats",
      "Grubhub",
      "Toast",
      "Slice",
    ]));
}

console.log("\nwhat people actually paste");
{
  // Commas, no scheme, and a regional domain — all real paste shapes.
  const links = parseOrderLinks("doordash.com/store/x, www.ubereats.com/store/y ubereats.com.au/store/z");
  check("bare hostnames get https", () => {
    assert.strictEqual(links.length, 3);
    assert.ok(links.every((l) => l.url.startsWith("https://")));
  });
  check("a regional domain still resolves to its platform", () =>
    assert.strictEqual(links[2].label, "Uber Eats"));
}

console.log("\nunknown hosts");
{
  const links = parseOrderLinks("https://tacosdirect.example.com/order");
  check("kept, labelled generically", () => {
    assert.strictEqual(links.length, 1);
    assert.strictEqual(links[0].label, "Order Online");
  });
}

console.log("\ndangerous input");
{
  const links = parseOrderLinks(
    'javascript:alert(1) data:text/html,<script>x</script> vbscript:msgbox file:///etc/passwd https://doordash.com/store/ok'
  );
  check("only the real link survives", () => {
    assert.strictEqual(links.length, 1, `got ${JSON.stringify(links)}`);
    assert.strictEqual(links[0].url, "https://doordash.com/store/ok");
  });
  check("no javascript: reaches the output", () =>
    assert.ok(!JSON.stringify(links).includes("javascript")));
}

console.log("\nhousekeeping");
{
  check("duplicates collapse", () => {
    const links = parseOrderLinks("https://doordash.com/a https://doordash.com/a");
    assert.strictEqual(links.length, 1);
  });
  check("http is upgraded to https", () => {
    const links = parseOrderLinks("http://grubhub.com/restaurant/x");
    assert.ok(links[0].url.startsWith("https://"));
  });
  check("capped so a paste of fifty links can't bloat the prompt", () => {
    const many = Array.from({ length: 40 }, (_, i) => `https://doordash.com/store/${i}`).join("\n");
    assert.strictEqual(parseOrderLinks(many).length, 6);
  });
  check("empty input is an empty list", () => {
    assert.deepStrictEqual(parseOrderLinks(""), []);
    assert.deepStrictEqual(parseOrderLinks(null), []);
    assert.deepStrictEqual(parseOrderLinks("   "), []);
  });
}

console.log("\nprompt block");
{
  const none = orderLinksBlock([]);
  check("with no links it forbids inventing one", () => {
    assert.match(none, /Do NOT invent/);
    assert.match(none, /DoorDash/);
  });

  const some = orderLinksBlock(parseOrderLinks("https://doordash.com/store/x"));
  check("with links it passes the exact url through", () => {
    assert.match(some, /https:\/\/doordash\.com\/store\/x/);
    assert.match(some, /DoorDash/);
    assert.match(some, /target="_blank" rel="noopener"/);
  });
  check("it still forbids inventing extras", () =>
    assert.match(some, /Do not invent any ordering link that is not in this list/));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
