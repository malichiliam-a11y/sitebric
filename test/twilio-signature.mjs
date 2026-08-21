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

// ---------------------------------------------------------------------
// The variants Twilio's own validator accepts.
//
// A single-variant check is what rejected the first real call this
// product ever took. Twilio signs the URL as IT built it, which is not
// always byte-identical to the URL that arrives — the port may or may
// not be present, and a space in the query may be "+" or "%20".
//
// These cases are lifted from a 4000-case cross-check against Twilio's
// own library (see the commit that added them); the port ones are the
// exact shape that failed 999 times before it was fixed.
// ---------------------------------------------------------------------
console.log("\nThe URL forms Twilio may have signed");
{
  const TOKEN = "a".repeat(32);
  const sign = (url, params = {}) =>
    expectedSignature(TOKEN, url, params);

  const accepts = (signedUrl, arrivingUrl, params = {}) =>
    isValidTwilioRequest({
      authToken: TOKEN,
      url: arrivingUrl,
      params,
      signature: sign(signedUrl, params),
    });

  check("the standard port is accepted when we rebuilt without it", () =>
    assert.ok(accepts(
      "https://sitebric.com:443/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("and the reverse — signed without, arrives with", () =>
    assert.ok(accepts(
      "https://sitebric.com/api/voice/incoming",
      "https://sitebric.com:443/api/voice/incoming"
    )));

  check("a space as '+' matches a space as '%20'", () =>
    assert.ok(accepts(
      "https://sitebric.com/api/voice/incoming?FromCity=NEW+YORK",
      "https://sitebric.com/api/voice/incoming?FromCity=NEW%20YORK"
    )));

  check("and the reverse", () =>
    assert.ok(accepts(
      "https://sitebric.com/api/voice/incoming?FromCity=NEW%20YORK",
      "https://sitebric.com/api/voice/incoming?FromCity=NEW+YORK"
    )));

  check("port and encoding differing together still matches", () =>
    assert.ok(accepts(
      "https://sitebric.com:443/api/voice/incoming?SpeechResult=how+much+is+it",
      "https://sitebric.com/api/voice/incoming?SpeechResult=how%20much%20is%20it"
    )));

  check("a non-standard port is not silently forgiven", () =>
    assert.ok(!accepts(
      "https://sitebric.com:8443/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("a different host is still refused", () =>
    assert.ok(!accepts(
      "https://evil.example/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("a different path is still refused", () =>
    assert.ok(!accepts(
      "https://sitebric.com/api/voice/status",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("a garbage signature is refused against every variant", () =>
    assert.ok(!isValidTwilioRequest({
      authToken: TOKEN,
      url: "https://sitebric.com/api/voice/incoming?FromCity=NEW+YORK",
      params: {},
      signature: "not-a-real-signature",
    })));
}

// ---------------------------------------------------------------------
// The www/apex pair.
//
// This is the one that killed the third real call. sitebric.com redirects
// to www.sitebric.com; Twilio requests the configured URL, follows the
// redirect, and signs the URL it lands on, while PUBLIC_BASE_URL hands us
// the other form. Same site, different string, every signature failed.
//
// The query below is lifted verbatim from the request that failed, so
// this test fails if that exact call would fail again.
// ---------------------------------------------------------------------
console.log("\nThe www and apex forms of our own host");
{
  const TOKEN = "t".repeat(32);
  const sign = (url, params = {}) => expectedSignature(TOKEN, url, params);
  const accepts = (signedUrl, arrivingUrl, params = {}) =>
    isValidTwilioRequest({
      authToken: TOKEN,
      url: arrivingUrl,
      params,
      signature: sign(signedUrl, params),
    });

  const REAL_QUERY =
    "?Called=%2B16076383619&ToState=NY&CallerCountry=US&Direction=inbound" +
    "&CallerState=NY&ToZip=13488&CallSid=CAfd73e9b7909b38a0fb84f9b2f38ec354" +
    "&To=%2B16076383619&CallerZip=&ToCountry=US&CalledZip=13488" +
    "&ApiVersion=2010-04-01&CalledCity=SCHENEVUS&CallStatus=ringing" +
    "&From=%2B19296025599&CalledCountry=US&CallerCity=NEW%20YORK%20CITY" +
    "&ToCity=SCHENEVUS&FromCountry=US&Caller=%2B19296025599" +
    "&FromCity=NEW%20YORK%20CITY&CalledState=NY&FromZip=&FromState=NY";

  check("the real failing call is accepted — signed at www, hashed at apex", () =>
    assert.ok(accepts(
      `https://www.sitebric.com/api/voice/incoming${REAL_QUERY}`,
      `https://sitebric.com/api/voice/incoming${REAL_QUERY}`
    )));

  check("and the reverse — signed at apex, hashed at www", () =>
    assert.ok(accepts(
      `https://sitebric.com/api/voice/incoming${REAL_QUERY}`,
      `https://www.sitebric.com/api/voice/incoming${REAL_QUERY}`
    )));

  check("host swapping combines with the port variants", () =>
    assert.ok(accepts(
      "https://www.sitebric.com:443/api/voice/status?CallStatus=no-answer",
      "https://sitebric.com/api/voice/status?CallStatus=no-answer"
    )));

  check("and with the query encoding variants", () =>
    assert.ok(accepts(
      "https://www.sitebric.com/api/voice/incoming?FromCity=NEW+YORK+CITY",
      "https://sitebric.com/api/voice/incoming?FromCity=NEW%20YORK%20CITY"
    )));

  // The swap toggles exactly one label on a host that came from our own
  // configuration. It must not become a general "any nearby host" rule.
  check("a different domain entirely is still refused", () =>
    assert.ok(!accepts(
      "https://evil.example/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("a lookalike subdomain is still refused", () =>
    assert.ok(!accepts(
      "https://api.sitebric.com/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("a sitebric.com suffix on someone else's domain is still refused", () =>
    assert.ok(!accepts(
      "https://sitebric.com.evil.example/api/voice/incoming",
      "https://sitebric.com/api/voice/incoming"
    )));

  check("www.www is not manufactured", () =>
    assert.ok(!accepts(
      "https://www.www.sitebric.com/api/voice/incoming",
      "https://www.sitebric.com/api/voice/incoming"
    )));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
