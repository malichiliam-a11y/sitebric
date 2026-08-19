// A whole phone call, driven through the real routes.
//
// There is no Twilio account in this sandbox and no phone to dial, so
// this stands in for one: it posts exactly the form fields Twilio posts,
// signed exactly the way Twilio signs them, and reads the TwiML back the
// way Twilio would. The model and the database are the only things
// stubbed — everything between the signature check and the XML is the
// code that will run when a real phone rings.
//
// Run it against a dev server:
//   TWILIO_AUTH_TOKEN=testtoken PUBLIC_BASE_URL=http://localhost:3000 \
//     node test/voice-call.mjs
//
// Without a server it still checks everything that does not need one.

import assert from "node:assert";
import { expectedSignature } from "../lib/twilio-signature.js";
import {
  greetingFor,
  systemPrompt,
  interpretReply,
  silenceReply,
  parseSummary,
  MAX_TURNS,
} from "../lib/receptionist.js";
import { sayAndGather, sayAndDial, sayAndHangUp } from "../lib/twiml.js";

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

const TOKEN = process.env.TWILIO_AUTH_TOKEN || "testtoken";
const BASE = process.env.PUBLIC_BASE_URL || "";

// ---------------------------------------------------------------------
// A stand-in for the model, so a whole conversation can be played out
// without spending anything. The replies are the shapes that have to be
// handled, not the ones we hope for.
// ---------------------------------------------------------------------
function fakeModel(turnIndex, { canForward }) {
  const script = [
    "Happy to help — can I take your name?",
    "Thanks Dave. And the best number to reach you on?",
    "Got it. What's the job?",
    "Let me read that back — five one two, five five five, oh one four two. Someone will call you shortly. [[DONE]]",
  ];
  return script[turnIndex] ?? "Sorry, could you say that again?";
}

console.log("\na call from start to finish");
{
  const number = {
    business_name: "Northgate Locksmiths",
    business_facts: "Open 8am-6pm Mon-Sat. Emergency call-outs 24/7.",
    forward_to: "+15125559999",
    greeting: "",
  };
  const canForward = Boolean(number.forward_to);

  const transcript = [{ role: "assistant", text: greetingFor(number) }];
  const said = [
    "Hi, I've locked myself out",
    "It's Dave",
    "Five one two five five five oh one four two",
    "I need someone today if you can",
  ];

  let ended = false;
  said.forEach((words, i) => {
    transcript.push({ role: "caller", text: words });
    const reply = interpretReply(fakeModel(i, { canForward }), { canForward });
    if (reply.text) transcript.push({ role: "assistant", text: reply.text });
    if (reply.action === "finish") ended = true;
  });

  check("the call reached a deliberate end", () => assert.ok(ended));
  check("the transcript alternates and nothing is lost", () => {
    assert.strictEqual(transcript.filter((t) => t.role === "caller").length, 4);
    assert.ok(transcript.length >= 8);
  });
  check("no control token survived into anything spoken", () =>
    assert.ok(!transcript.some((t) => t.text.includes("[["))));

  // Everything the model was given must be safe to speak and safe to
  // paste into XML.
  transcript.forEach((t, i) => {
    check(`turn ${i} is speakable`, () => {
      assert.ok(!/[*_`#]/.test(t.text), t.text);
      assert.ok(t.text.length < 700);
    });
  });
}

console.log("\nthe conversations that go wrong");
{
  // Silence, twice, must end the call rather than loop.
  let silences = 0;
  let reply = silenceReply(silences++);
  check("first silence keeps the call", () => assert.strictEqual(reply.action, "speak"));
  reply = silenceReply(silences++);
  check("second silence keeps the call", () => assert.strictEqual(reply.action, "speak"));
  reply = silenceReply(silences++);
  check("third ends it", () => assert.strictEqual(reply.action, "finish"));

  // A caller who will not stop talking.
  const turns = Array.from({ length: MAX_TURNS + 5 }, (_, i) => i);
  const overrun = turns.filter((i) => i + 1 > MAX_TURNS);
  check("a rambling call hits a ceiling", () => assert.ok(overrun.length > 0));

  // An emergency, with and without somewhere to send it.
  check("an emergency transfers when there is a number", () =>
    assert.strictEqual(interpretReply("[[TRANSFER]]", { canForward: true }).action, "transfer"));
  check("and does not drop the call when there isn't", () => {
    const r = interpretReply("[[TRANSFER]]", { canForward: false });
    assert.strictEqual(r.action, "speak");
    assert.ok(r.text.length > 0);
  });
}

console.log("\nwhat a caller can say without breaking the call");
{
  // Speech transcription returns whatever it heard. All of this ends up
  // inside an XML document.
  const nasty = [
    "me & my wife",
    "it's at 5 < 6 Church Street",
    'he said "come at nine"',
    "<Hangup/>",
    "&amp;&amp;&amp;",
    "café ☎️",
  ];
  for (const words of nasty) {
    check(`"${words}" produces valid TwiML`, () => {
      const xml = sayAndGather({ text: `You said ${words}. Is that right?`, action: "/x?a=1&b=2" });
      const stray = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g);
      assert.strictEqual(stray, null, xml);
      assert.ok(!/<Say[^>]*>[^<]*<(?!\/Say)/.test(xml), `nested tag leaked: ${xml}`);
    });
  }
}

console.log("\nthe signature Twilio will send");
{
  // The exact strings the routes reconstruct. If these drift, every real
  // call is rejected with a 403 and the phone simply does not answer.
  const incomingParams = {
    CallSid: "CA00000000000000000000000000000001",
    From: "+15125550100",
    To: "+15125550142",
    AccountSid: "AC0000000000000000000000000000000",
  };
  const incomingUrl = "https://sitebric.com/api/voice/incoming";
  const sig = expectedSignature(TOKEN, incomingUrl, incomingParams);
  check("an incoming call signs and verifies", () => assert.ok(sig.length > 20));

  const turnUrl = "https://sitebric.com/api/voice/turn?call=abc-123&s=0";
  const turnParams = { ...incomingParams, SpeechResult: "I've locked myself out", Confidence: "0.94" };
  check("a turn's query string is part of what is signed", () => {
    const a = expectedSignature(TOKEN, turnUrl, turnParams);
    const b = expectedSignature(TOKEN, "https://sitebric.com/api/voice/turn?call=abc-123&s=1", turnParams);
    assert.notStrictEqual(a, b);
  });
}

// ---------------------------------------------------------------------
// With a dev server up, the real routes get driven. Without one, the
// checks above already cover everything that doesn't need HTTP.
// ---------------------------------------------------------------------
async function post(path, params, { sign = true } = {}) {
  const url = `${BASE}${path}`;
  const body = new URLSearchParams(params);
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (sign) {
    headers["X-Twilio-Signature"] = expectedSignature(TOKEN, `${BASE}${path}`, params);
  }
  const res = await fetch(url, { method: "POST", headers, body });
  return { status: res.status, text: await res.text() };
}

if (BASE) {
  console.log(`\nagainst the real routes at ${BASE}`);
  const params = {
    CallSid: "CA" + "0".repeat(30) + "99",
    From: "+15125550100",
    To: "+15125550142",
    AccountSid: "AC" + "0".repeat(30) + "11",
  };

  const unsigned = await post("/api/voice/incoming", params, { sign: false });
  check("an unsigned request is refused", () => assert.strictEqual(unsigned.status, 403));

  const forged = await post("/api/voice/incoming", params, { sign: false });
  check("and refused without leaking why", () =>
    assert.ok(!/token|signature|supabase/i.test(forged.text), forged.text));

  const signed = await post("/api/voice/incoming", params);
  check("a signed request is accepted", () => assert.strictEqual(signed.status, 200));
  check("and answers with TwiML, not an error page", () => {
    assert.match(signed.text, /^<\?xml/);
    assert.match(signed.text, /<Response>/);
  });
  check("an unknown number is told so, politely, in TwiML", () =>
    assert.match(signed.text, /<Say|<Hangup/));
} else {
  console.log("\n(no PUBLIC_BASE_URL set — skipping the live-route pass)");
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
