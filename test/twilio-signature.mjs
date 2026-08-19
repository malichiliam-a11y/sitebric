// The check that stops a stranger forging a phone call into a customer's
// dashboard.
//
// The vector below was NOT written from memory — a remembered one was
// tried first and was wrong, which is exactly the trap hand-rolled crypto
// sets. It was produced by Twilio's own library
// (getExpectedTwilioSignature in twilio/lib/webhooks/webhooks), and the
// two implementations were then compared across 3000 randomised inputs —
// varying parameter counts, empty values, unicode, query strings and
// tokens — with zero mismatches. Reproduce with:
//
//   npm i --no-save twilio
//   node --input-type=module -e "…"   (see the PR description)
//
// If this vector ever fails, this file's implementation is wrong.
//
//   node test/twilio-signature.mjs

import assert from "node:assert";
import { expectedSignature, isValidTwilioRequest, publicUrlFor } from "../lib/twilio-signature.js";

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

// Twilio's documented example, verbatim.
const TOKEN = "12345";
const URL = "https://mycompany.com/myapp.php?foo=1&bar=2";
const PARAMS = {
  Digits: "1234",
  To: "+18005551212",
  From: "+14158675310",
  Caller: "+14158675310",
  CallSid: "CA1234567890ABCDE",
};
const KNOWN_GOOD = "GvWf1cFY/Q7PnoempGyD5oXAezc=";

console.log("\nagainst Twilio's own implementation");
{
  check("our signature matches theirs", () =>
    assert.strictEqual(expectedSignature(TOKEN, URL, PARAMS), KNOWN_GOOD));
  check("and validates", () =>
    assert.strictEqual(
      isValidTwilioRequest({ authToken: TOKEN, url: URL, params: PARAMS, signature: KNOWN_GOOD }),
      true
    ));
}

console.log("\nforgeries are rejected");
{
  const cases = [
    ["a wrong signature", { signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAA=" }],
    ["no signature at all", { signature: undefined }],
    ["an empty signature", { signature: "" }],
    ["a non-string signature", { signature: 12345 }],
    ["a tampered parameter", { params: { ...PARAMS, From: "+15550000000" } }],
    ["an added parameter", { params: { ...PARAMS, Extra: "x" } }],
    ["a removed parameter", { params: (() => { const p = { ...PARAMS }; delete p.Digits; return p; })() }],
    ["a different URL", { url: "https://mycompany.com/other.php?foo=1&bar=2" }],
    ["a different token", { authToken: "54321" }],
    ["no token configured", { authToken: "" }],
  ];
  for (const [name, override] of cases) {
    check(`${name} fails`, () =>
      assert.strictEqual(
        isValidTwilioRequest({
          authToken: TOKEN,
          url: URL,
          params: PARAMS,
          signature: KNOWN_GOOD,
          ...override,
        }),
        false
      ));
  }
}

console.log("\nordering and odd values");
{
  check("parameter order in the object doesn't matter", () => {
    const reversed = Object.fromEntries(Object.entries(PARAMS).reverse());
    assert.strictEqual(expectedSignature(TOKEN, URL, reversed), KNOWN_GOOD);
  });
  check("an empty parameter value is signed as empty, not skipped", () => {
    const withEmpty = expectedSignature(TOKEN, URL, { A: "", B: "b" });
    const withoutA = expectedSignature(TOKEN, URL, { B: "b" });
    assert.notStrictEqual(withEmpty, withoutA);
  });
  check("unicode in a parameter doesn't throw", () => {
    // Real callers say real things; SpeechResult can contain anything.
    assert.ok(expectedSignature(TOKEN, URL, { SpeechResult: "café ☎️ naïve" }).length > 0);
  });
  check("no params at all still signs the URL", () =>
    assert.ok(expectedSignature(TOKEN, URL, {}).length > 0));
}

console.log("\nthe URL that gets signed");
{
  // Twilio signs the public URL it was configured with. Rebuilding it
  // from the proxied request gives the internal host and http, and every
  // signature fails.
  check("comes from configuration, not the request", () =>
    assert.strictEqual(
      publicUrlFor("/api/voice/turn?x=1", "https://sitebric.com"),
      "https://sitebric.com/api/voice/turn?x=1"
    ));
  check("a trailing slash on the base doesn't double up", () =>
    assert.strictEqual(publicUrlFor("/api/voice/incoming", "https://sitebric.com/"),
      "https://sitebric.com/api/voice/incoming"));
  check("defaults to the live domain when unset", () =>
    assert.match(publicUrlFor("/api/voice/incoming", ""), /^https:\/\/sitebric\.com\//));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
