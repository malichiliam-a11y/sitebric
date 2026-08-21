// Texting a caller a booking link.
//
// The link goes out from the BUSINESS'S OWN NUMBER to a stranger who just
// rang them, so it carries their credibility, not ours. That is the whole
// reason this validates rather than passes through: a bad link here is
// the business texting something dodgy to their own customer.
//
//   node test/booking.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  bookingUrl,
  hasBooking,
  bookingSms,
  bookingSpoken,
  bookingFailedSpoken,
} from "../lib/booking.js";
import { interpretReply, systemPrompt } from "../lib/receptionist.js";

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

console.log("\nWhat may be texted to a customer");
{
  check("a normal booking page passes", () =>
    assert.strictEqual(
      bookingUrl("https://calendly.com/liam/30min"),
      "https://calendly.com/liam/30min"
    ));

  check("any provider works — nothing is hardcoded to Calendly", () => {
    for (const u of [
      "https://cal.com/liam/intro",
      "https://squareup.com/appointments/book/abc",
      "https://northgatelocksmiths.com/book",
    ]) {
      assert.strictEqual(bookingUrl(u), u, u);
    }
  });

  for (const [why, value] of [
    ["http is not good enough for a link we send out", "http://calendly.com/x"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,<script>x</script>"],
    ["credentials embedded in the URL", "https://user:pw@calendly.com/x"],
    ["a hostname with no dot", "https://localhost/x"],
    ["not a URL at all", "book me in please"],
    ["empty", ""],
    ["null", null],
    ["a number", 42],
    ["an array that stringifies to a valid URL", ["https://calendly.com/x"]],
  ]) {
    check(`${why} is refused`, () => assert.strictEqual(bookingUrl(value), ""));
  }

  check("something absurdly long is refused", () =>
    assert.strictEqual(bookingUrl("https://calendly.com/" + "x".repeat(600)), ""));

  check("hasBooking agrees with bookingUrl", () => {
    assert.strictEqual(hasBooking("https://cal.com/x"), true);
    assert.strictEqual(hasBooking("http://cal.com/x"), false);
    assert.strictEqual(hasBooking(""), false);
  });
}

console.log("\nThe message itself");
{
  const sms = bookingSms({
    businessName: "Northgate Locksmiths",
    url: "https://calendly.com/liam/30min",
  });

  check("it names the business first", () =>
    assert.match(sms, /^Northgate Locksmiths/));

  check("an unexplained link from an unknown number does not get tapped", () =>
    assert.ok(sms.indexOf("Northgate") < sms.indexOf("https://")));

  check("the link is in it", () =>
    assert.match(sms, /https:\/\/calendly\.com\/liam\/30min/));

  check("it is short enough to read on a lock screen", () =>
    assert.ok(sms.length < 160, `${sms.length} chars`));

  check("a bad link produces no message at all, rather than a broken one", () =>
    assert.strictEqual(bookingSms({ businessName: "X", url: "http://x.com" }), ""));

  check("what is said aloud contains no URL — nobody writes those down", () => {
    assert.ok(!/https?:|\.com|dot com/i.test(bookingSpoken()));
    assert.ok(!/https?:|\.com|dot com/i.test(bookingFailedSpoken()));
  });

  check("the failure line does not claim a text was sent", () => {
    assert.ok(!/texted you|sent you/i.test(bookingFailedSpoken()));
    assert.match(bookingFailedSpoken(), /call you straight back/i);
  });
}

console.log("\nThe conversation");
{
  check("[[BOOK]] books when the line has a page", () =>
    assert.strictEqual(interpretReply("Sure — [[BOOK]]", { canBook: true }).action, "book"));

  check("and does not when it has none", () =>
    assert.strictEqual(interpretReply("[[BOOK]]", { canBook: false }).action, "speak"));

  check("a line with no page never promises a text it cannot send", () => {
    const r = interpretReply("[[BOOK]]", { canBook: false });
    assert.ok(!/text/i.test(r.text), r.text);
  });

  // A caller who just said "yes, text me the link" is not finished. If
  // [[DONE]] won, they would be hung up on instead.
  check("booking beats a [[DONE]] in the same reply", () =>
    assert.strictEqual(
      interpretReply("Great, [[BOOK]] [[DONE]]", { canBook: true }).action,
      "book"
    ));

  check("the token never reaches the caller's ear", () =>
    assert.ok(!interpretReply("Booking you in [[BOOK]]", { canBook: false }).text.includes("[[")));

  check("the prompt only mentions booking when there is a page", () => {
    const withPage = systemPrompt({ businessName: "X", businessFacts: "", canBook: true });
    const without = systemPrompt({ businessName: "X", businessFacts: "", canBook: false });
    assert.match(withPage, /BOOKING A TIME/);
    assert.ok(!/BOOKING A TIME/.test(without));
  });

  check("it is told not to read the link out", () => {
    const withPage = systemPrompt({ businessName: "X", businessFacts: "", canBook: true });
    assert.match(withPage, /Do not read the link out/);
  });

  check("it is told it still does not know what times are free", () => {
    const withPage = systemPrompt({ businessName: "X", businessFacts: "", canBook: true });
    assert.match(withPage, /do not know what times are free/i);
  });
}

console.log("\nHow it is wired");
{
  const turn = readFileSync(
    new URL("../app/api/voice/turn/route.js", import.meta.url),
    "utf8"
  );
  check("the text goes out mid-call, not after it", () =>
    assert.match(turn, /reply\.action === "book"[\s\S]{0,600}await sendSms/));

  check("it is sent from the number the caller just dialled", () =>
    assert.match(turn, /from: number\.phone_number/));

  check("a failed send says so rather than lying", () =>
    assert.match(turn, /sent \? bookingSpoken\(\) : bookingFailedSpoken\(\)/));

  check("the call stays open afterwards", () =>
    assert.match(turn, /reply\.action === "book"[\s\S]{0,900}sayAndGather/));

  const sms = readFileSync(new URL("../lib/twilio-sms.js", import.meta.url), "utf8");
  check("sending cannot hang the call", () => {
    assert.match(sms, /AbortController/);
    assert.match(sms, /SEND_TIMEOUT_MS/);
  });
  check("sending never throws", () => assert.match(sms, /catch \(err\)[\s\S]{0,200}return \{ sent: false \}/));
  check("the caller's number is not logged with the failure", () =>
    assert.ok(!/console\.error\([^)]*\bto\b/.test(sms)));

  const api = readFileSync(
    new URL("../app/api/receptionist/route.js", import.meta.url),
    "utf8"
  );
  check("the API normalises the link rather than storing what it is given", () =>
    assert.match(api, /patch\.booking_url = bookingUrl\(body\.bookingUrl\)/));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
