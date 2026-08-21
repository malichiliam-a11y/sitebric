// The receptionist speaks for someone else's business on a recorded line.
// The checks that matter are about what it must never say, and about
// knowing when it is the wrong answer to the call.
//
//   node test/receptionist.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  greetingFor,
  systemPrompt,
  interpretReply,
  cleanForSpeech,
  silenceReply,
  outOfTurnsReply,
  summaryPrompt,
  parseSummary,
  overLimitMessage,
  demoLimitMessage,
  MAX_TURNS,
  DEMO_MAX_TURNS,
  DEMO_CALLS_PER_DAY,
  TURN_MAX_TOKENS,
  isDecline,
  closingQuestion,
} from "../lib/receptionist.js";
import { esc, sayAndGather, sayAndDial, sayAndHangUp } from "../lib/twiml.js";

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

console.log("\nit says what it is");
{
  const g = greetingFor({ businessName: "Northgate Locksmiths" });
  check("the greeting names the business", () => assert.match(g, /Northgate Locksmiths/));
  check("and admits it is an assistant in the first breath", () => assert.match(g, /assistant/i));
  check("a custom greeting is used as written", () =>
    assert.strictEqual(
      greetingFor({ businessName: "X", greeting: "Ace Plumbing, how can I help?" }),
      "Ace Plumbing, how can I help?"
    ));
  check("a missing business name doesn't produce 'Thanks for calling undefined'", () => {
    const bare = greetingFor({});
    assert.ok(!/undefined|null/.test(bare), bare);
  });

  const p = systemPrompt({ businessName: "Ace", businessFacts: "", canForward: true });
  check("the prompt forbids pretending to be human", () => assert.match(p, /you are an assistant/i));
}

console.log("\nit will not invent the business's facts");
{
  const p = systemPrompt({ businessName: "Ace Plumbing", businessFacts: "", canForward: true });
  check("with no facts, it is told it may state nothing", () =>
    assert.match(p, /Nothing was provided/));
  check("prices, hours and availability are named explicitly", () => {
    for (const forbidden of [/price/i, /time slot/i, /availability/i, /service area/i]) {
      assert.match(p, forbidden);
    }
  });
  check("it is told to defer rather than guess", () => assert.match(p, /have someone confirm/i));

  const withFacts = systemPrompt({
    businessName: "Ace",
    businessFacts: "Open 7am-6pm Mon-Sat. Call-out fee $89. We do not do gas work.",
    canForward: true,
  });
  check("real facts are quoted into their own block", () => {
    assert.match(withFacts, /Call-out fee \$89/);
    // Fenced so the model can tell where the business's text ends and its
    // instructions begin.
    assert.match(withFacts, /"""[\s\S]*Call-out fee[\s\S]*"""/);
  });
}

console.log("\nit knows when it is the wrong answer to the call");
{
  const transfer = interpretReply("[[TRANSFER]]", { canForward: true });
  check("the transfer token puts the call through", () =>
    assert.strictEqual(transfer.action, "transfer"));

  const p = systemPrompt({ businessName: "Ace", businessFacts: "", canForward: true });
  check("emergencies are spelled out, not left to judgement", () => {
    for (const emergency of [/leak/i, /flooding/i, /no heat/i, /lockout/i, /smoke/i]) {
      assert.match(p, emergency);
    }
  });

  // The dangerous case: nobody to transfer to. Dialling an empty number
  // drops the call and the caller is gone.
  const noForward = interpretReply("[[TRANSFER]]", { canForward: false });
  check("with nobody to transfer to, it keeps the caller and gets a number", () => {
    assert.strictEqual(noForward.action, "speak");
    assert.match(noForward.text, /number/i);
  });
  const pNo = systemPrompt({ businessName: "Ace", businessFacts: "", canForward: false });
  check("and it is told not to offer a transfer at all", () =>
    assert.match(pNo, /do NOT offer to put anyone through/));
}

console.log("\nnothing gets read aloud that shouldn't be");
{
  check("markdown never reaches the caller's ear", () => {
    const spoken = cleanForSpeech("**Sure!** Here's what I can do:\n- take a message\n- pass it on");
    assert.ok(!/[*_`#]/.test(spoken), spoken);
    assert.ok(!/^- /m.test(spoken), spoken);
  });
  check("control tokens are stripped from what is spoken", () => {
    const r = interpretReply("Someone will call you back shortly. [[DONE]]");
    assert.strictEqual(r.action, "finish");
    assert.ok(!r.text.includes("[["), r.text);
  });
  check("an empty model reply still says something", () => {
    assert.ok(interpretReply("").text.length > 0);
    assert.ok(interpretReply(null).text.length > 0);
    assert.ok(interpretReply("[[DONE]]").text.length > 0);
  });
  check("a runaway reply is capped before it is spoken", () =>
    assert.ok(cleanForSpeech("word ".repeat(500)).length <= 600));
}

console.log("\nsilence, and calls that go nowhere");
{
  check("first silence asks once more", () => assert.strictEqual(silenceReply(0).action, "speak"));
  check("repeated silence ends the call rather than looping forever", () =>
    assert.strictEqual(silenceReply(2).action, "finish"));
  check("running out of turns ends deliberately", () => {
    assert.strictEqual(outOfTurnsReply().action, "finish");
    assert.ok(MAX_TURNS > 0 && MAX_TURNS <= 20);
  });
  check("the over-limit message never implies they are shut", () => {
    const m = overLimitMessage("Ace Plumbing");
    assert.ok(!/closed|shut|unavailable service|cancelled/i.test(m), m);
    assert.match(m, /call you straight back/i);
    // No tone is promised, because nothing is recording. Twilio hands us
    // the caller's number anyway, so the call is still logged.
    assert.ok(!/after the tone|leave a message/i.test(m), m);
  });
}

console.log("\nthe public demo line");
{
  // The one number a stranger can dial, so the only one that needs
  // protecting from strangers.
  check("a demo call is shorter than a real one", () => {
    assert.ok(DEMO_MAX_TURNS > 0);
    assert.ok(DEMO_MAX_TURNS < MAX_TURNS, `${DEMO_MAX_TURNS} is not below ${MAX_TURNS}`);
  });
  check("a caller gets enough goes to actually try it", () => {
    assert.ok(DEMO_CALLS_PER_DAY >= 2 && DEMO_CALLS_PER_DAY <= 10);
  });
  check("running out doesn't sound broken — the hearer is a prospect", () => {
    const m = demoLimitMessage();
    assert.ok(!/error|sorry, we|unavailable|blocked|limit exceeded/i.test(m), m);
    assert.match(m, /sitebric/i);
  });
  check("and it says nothing a phone would read as markup", () =>
    assert.ok(!/[*_`#<>&]/.test(demoLimitMessage()), demoLimitMessage()));
}

console.log("\nturning a call into something someone can act on");
{
  const good = parseSummary(
    'Here you go: {"caller_name":"Dave","callback_number":"512 555 0142","summary":"Wants a quote for a new lock.","urgency":"normal"}'
  );
  check("json is read out of a chatty reply", () => {
    assert.strictEqual(good.caller_name, "Dave");
    assert.strictEqual(good.callback_number, "512 555 0142");
  });
  check("a broken reply does not throw", () => {
    for (const bad of ["", null, "not json", "{", '{"caller_name":', "[]"]) {
      const r = parseSummary(bad);
      assert.strictEqual(typeof r.summary, "string");
      assert.strictEqual(r.urgency, "normal");
    }
  });
  check("an invented urgency falls back rather than being trusted", () =>
    assert.strictEqual(parseSummary('{"urgency":"CRITICAL!!!"}').urgency, "normal"));
  check("non-string fields don't leak objects into the row", () => {
    const r = parseSummary('{"caller_name":{"a":1},"summary":["x"],"callback_number":99}');
    assert.strictEqual(r.caller_name, "");
    assert.strictEqual(r.summary, "");
    assert.strictEqual(r.callback_number, "");
  });
  check("the summary prompt forbids guessing a name from the number", () =>
    assert.match(summaryPrompt([]), /Do not guess a name from the phone number/));
  check("an empty transcript still produces a valid prompt", () =>
    assert.match(summaryPrompt([]), /no words were exchanged/));
}

console.log("\nthe XML survives what callers actually say");
{
  // A caller says "me and my wife"; a business is called "Smith & Sons".
  // A raw & makes Twilio reject the document and the call drops
  // mid-sentence, which reads as the product breaking.
  check("ampersands are escaped", () => assert.strictEqual(esc("Smith & Sons"), "Smith &amp; Sons"));
  check("angle brackets are escaped", () =>
    assert.ok(!/[<>]/.test(esc("<script>alert(1)</script>"))));
  check("control characters are dropped, not escaped", () =>
    assert.strictEqual(esc("ab c"), "abc"));

  const xml = sayAndGather({
    text: 'Smith & Sons — "how" can I help?',
    action: "/api/voice/turn?n=1&x=2",
  });
  check("a full Gather document is well-formed", () => {
    assert.match(xml, /^<\?xml/);
    // Every & in the output must be the start of an entity.
    const stray = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g);
    assert.strictEqual(stray, null, `stray & in ${xml}`);
  });
  check("the action URL is escaped too", () => assert.match(xml, /n=1&amp;x=2/));
  check("a dialled number is escaped", () =>
    assert.match(
      sayAndDial({ text: "Putting you through.", to: "+15125550142", callerId: "+15125559999" }),
      /<Dial[^>]*>\+15125550142<\/Dial>/
    ));
  check("hang-up is well-formed", () => assert.match(sayAndHangUp("Bye."), /<Hangup\/><\/Response>$/));
}

// ---------------------------------------------------------------------
// The four bugs from the first real call.
//
// The transcript opened with the assistant transcribing its own greeting
// as the caller, burned three of six turns doing it, hit the ceiling at
// the exact moment the caller asked a real question, and answered with a
// canned "I'll pass all of that on" — while introducing itself as "the
// office" because the business name never reached the greeting.
//
// Every one of those is one line of code, and every one of them looked
// like "the AI is stupid" from the outside.
// ---------------------------------------------------------------------
console.log("\nThe assistant must not hear itself");
{
  const xml = sayAndGather({ text: "Hi there", action: "/api/voice/turn?call=1&s=0" });

  check("<Say> is not nested inside <Gather>", () => {
    const gatherAt = xml.indexOf("<Gather");
    const sayAt = xml.indexOf("<Say");
    assert.ok(sayAt > -1 && gatherAt > -1, "both verbs should be present");
    assert.ok(
      sayAt < gatherAt,
      "the prompt is inside <Gather>, which is barge-in mode — Twilio starts " +
        "listening while it is still speaking and transcribes its own voice"
    );
  });

  check("<Gather> is self-closing, so nothing can be nested in it later", () =>
    assert.match(xml, /<Gather[^>]*\/>/));

  check("the prompt is still actually spoken", () =>
    assert.match(xml, /<Say voice="[^"]+">Hi there<\/Say>/));

  check("and the action still carries the escaped query", () =>
    assert.match(xml, /action="\/api\/voice\/turn\?call=1&amp;s=0"/));
}

console.log("\nThe greeting says who it is answering for");
{
  check("the business name is used", () =>
    assert.match(
      greetingFor({ businessName: "Northgate Locksmiths" }),
      /Northgate Locksmiths/
    ));

  // The bug: the caller passed the database row straight in, and the row
  // is snake_case. Every real call opened "Thanks for calling the office".
  check("the route maps the row's fields explicitly", () => {
    const src = readFileSync(
      new URL("../app/api/voice/incoming/route.js", import.meta.url),
      "utf8"
    );
    assert.match(src, /greetingFor\(\{\s*businessName: number\.business_name/);
    assert.ok(
      !/greetingFor\(number\)/.test(src),
      "the row is passed straight in again — camelCase fields will be undefined"
    );
  });

  check("a custom greeting still wins", () =>
    assert.strictEqual(
      greetingFor({ businessName: "Northgate", greeting: "Northgate, how can I help?" }),
      "Northgate, how can I help?"
    ));
}

console.log("\nIt answers rather than taking a message");
{
  const prompt = systemPrompt({
    businessName: "Northgate Locksmiths",
    businessFacts: "Call-out fee $89, waived if you book the work.",
    canForward: false,
  });

  check("being useful is the first instruction, not the last", () => {
    const useful = prompt.indexOf("BE USEFUL FIRST");
    const details = prompt.indexOf("WHAT TO COME AWAY WITH");
    assert.ok(useful > -1, "the prompt no longer leads with being useful");
    assert.ok(useful < details, "taking details still comes before helping");
  });

  check("it is told to answer from the facts, not defer", () =>
    assert.match(prompt, /ANSWER IT/));

  check("it is told not to end the call mid-question", () =>
    assert.match(prompt, /Do not end the call while they are still asking/));

  // The guardrail this must never trade away.
  check("it still may not invent a price", () =>
    assert.match(prompt, /Never state a price[^\n]*not in the facts/));

  check("it still may not invent contact details", () =>
    assert.match(prompt, /Never invent a phone number/));

  check("with no facts it is told to say so honestly", () => {
    const bare = systemPrompt({ businessName: "X", businessFacts: "", canForward: false });
    assert.match(bare, /Nothing was provided/);
    assert.match(bare, /may not state anything about this business beyond its name/);
  });
}

console.log("\nThe demo gets enough turns to be convincing");
{
  check("a demo call is not cut off after a handful of exchanges", () =>
    assert.ok(DEMO_MAX_TURNS >= 10, `DEMO_MAX_TURNS is ${DEMO_MAX_TURNS}`));

  check("a real line still gets more than the demo", () =>
    assert.ok(MAX_TURNS > DEMO_MAX_TURNS));

  check("replies are capped short enough to sit through", () =>
    assert.ok(TURN_MAX_TOKENS <= 120, `TURN_MAX_TOKENS is ${TURN_MAX_TOKENS}`));
}

// ---------------------------------------------------------------------
// Hanging up on someone mid-question.
//
// The first call that worked end to end ended like this:
//
//   caller:    "So it's going to be free if I booked the work with you?"
//   assistant: "That's right — the $89 fee is waived if you book the
//               work. Someone will call you back shortly."
//   [call over]
//
// The model emits [[DONE]] as soon as it has a name, a number and a
// reason, which on a real call is routinely while the caller is still
// talking. So a finish now speaks its closing line, asks once more, and
// only ends on an answer that is clearly "no".
// ---------------------------------------------------------------------
console.log("\nIt asks before it hangs up");
{
  check("there is a closing question to ask", () =>
    assert.match(closingQuestion(), /anything else/i));

  check("silence on the closing turn ends the call", () =>
    assert.strictEqual(isDecline(""), true));

  for (const said of ["no", "Nope", "no thanks", "That's it.", "thats all",
                      "all set", "I'm good", "bye", "nothing else"]) {
    check(`"${said}" ends the call`, () => assert.strictEqual(isDecline(said), true));
  }

  // These are the ones that matter. Every one of them, treated as a
  // decline, is a caller hung up on mid-sentence.
  for (const said of [
    "how much is it?",
    "No, but how much would it be?",
    "yes actually",
    "um can you also do house locks",
    "yeah one more thing",
    "wait",
    "do you come out on Sundays",
    "sorry what was the price again",
  ]) {
    check(`"${said}" keeps the call open`, () =>
      assert.strictEqual(isDecline(said), false));
  }

  check("an exact decline wins over the question test", () =>
    // "that is it" contains "is", which the question heuristic looks for.
    assert.strictEqual(isDecline("that is it"), true));

  check("a long answer is never read as 'no'", () =>
    assert.strictEqual(
      isDecline("no I think we covered everything thanks very much indeed"),
      false
    ));
}

console.log("\nThe route only ends the call when it should");
{
  const src = readFileSync(
    new URL("../app/api/voice/turn/route.js", import.meta.url),
    "utf8"
  );

  check("a normal finish asks again instead of hanging up", () =>
    assert.match(src, /if \(endNow\) return twimlResponse\(sayAndHangUp/));

  check("the closing question is appended to the closing line", () =>
    assert.match(src, /\$\{reply\.text\} \$\{closingQuestion\(\)\}/));

  check("the closing turn cannot loop — it ends on a decline", () =>
    assert.match(src, /isDecline\(spoken\)[\s\S]{0,400}endNow: true/));

  check("the turn ceiling still really ends the call", () =>
    assert.match(src, /outOfTurnsReply\(\)[\s\S]{0,400}endNow: true/));

  check("giving up on silence still really ends the call", () =>
    assert.match(src, /endNow: reply\.action === "finish"/));

  check("the action URL is built in one place, so it cannot drift from the signature", () => {
    assert.match(src, /function turnPath\(/);
    assert.ok(
      !/\/api\/voice\/turn\?call=\$\{encodeURIComponent\(callId\)\}&s=\$\{silences\}`\s*\)/.test(src),
      "the path is still being hand-built somewhere as well as by turnPath"
    );
  });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
