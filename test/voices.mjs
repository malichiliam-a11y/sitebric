// Which voice a line speaks in.
//
// The value ends up in a TwiML attribute, and a name Twilio does not
// recognise does NOT error — it silently falls back to Twilio's own
// 2005-era synthesiser, which is the exact robot everyone is trying to
// get away from. So a bad value here is invisible until somebody rings
// the number and winces, and the only safe shape is an allowlist.
//
//   node test/voices.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { VOICES, DEFAULT_VOICE, voiceFor, isKnownVoice } from "../lib/voices.js";

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

console.log("\nThe list itself");
{
  check("there is more than one to try", () => assert.ok(VOICES.length >= 4));
  check("the default is on the list", () =>
    assert.ok(VOICES.some((v) => v.id === DEFAULT_VOICE)));
  check("every entry has a label and a blurb someone can choose by", () => {
    for (const v of VOICES) {
      assert.ok(v.id && v.label && v.blurb, `incomplete entry: ${JSON.stringify(v)}`);
    }
  });
  check("there is a spread of voices, not eight of the same", () => {
    assert.ok(new Set(VOICES.map((v) => v.id)).size === VOICES.length, "duplicate ids");
    assert.ok(VOICES.length >= 6, "too few to find one that sounds right");
  });
  check("they are all Polly neural — the default Twilio voice is the robot", () => {
    for (const v of VOICES) assert.match(v.id, /^Polly\.[A-Za-z]+-Neural$/);
  });
}

console.log("\nAnything not on the list becomes the default");
{
  check("a known voice passes through", () =>
    assert.strictEqual(voiceFor("Polly.Ruth-Neural"), "Polly.Ruth-Neural"));

  // Each of these, passed through to Twilio, would be heard as the robot.
  for (const [name, value] of [
    ["an unknown name", "Polly.Nonexistent-Neural"],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["an object", {}],
    ["Twilio's own default", "alice"],
    ["something with a quote in it", 'Polly.Joanna-Neural" x="y'],
    ["a whole XML attribute", '"><Say>gotcha</Say><Say voice="'],
  ]) {
    check(`${name} falls back`, () => assert.strictEqual(voiceFor(value), DEFAULT_VOICE));
  }

  // String(["Polly.Ruth-Neural"]) === "Polly.Ruth-Neural", so a
  // one-element array from a JSON body sails through a naive check. Same
  // trap as styleById in lib/site-styles.js.
  check("a one-element array does not sneak through", () =>
    assert.strictEqual(voiceFor(["Polly.Ruth-Neural"]), DEFAULT_VOICE));

  check("nor does an object with a matching toString", () =>
    assert.strictEqual(
      voiceFor({ toString: () => "Polly.Ruth-Neural" }),
      DEFAULT_VOICE
    ));

  check("isKnownVoice agrees, including on the non-strings", () => {
    assert.strictEqual(isKnownVoice("Polly.Ruth-Neural"), true);
    assert.strictEqual(isKnownVoice(["Polly.Ruth-Neural"]), false);
    assert.strictEqual(isKnownVoice(""), false);
    assert.strictEqual(isKnownVoice(null), false);
  });
}

console.log("\nIt actually reaches the call");
{
  const twiml = readFileSync(new URL("../lib/twiml.js", import.meta.url), "utf8");
  check("every spoken verb takes a voice", () => {
    for (const fn of ["sayAndGather", "sayAndHangUp", "sayAndDial"]) {
      assert.match(twiml, new RegExp(`${fn}\\([^)]*voice`), `${fn} cannot be given a voice`);
    }
  });
  check("say() runs it through the allowlist", () =>
    assert.match(twiml, /voice="\$\{esc\(voiceFor\(voice\)/));

  const api = readFileSync(
    new URL("../app/api/receptionist/route.js", import.meta.url),
    "utf8"
  );
  check("the API validates before storing, rather than storing what it is given", () =>
    assert.match(api, /isKnownVoice\(body\.voice\)/));

  for (const [route, file] of [
    ["incoming", "../app/api/voice/incoming/route.js"],
    ["turn", "../app/api/voice/turn/route.js"],
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    check(`the ${route} route speaks in the line's voice`, () =>
      assert.match(src, /voice: number\.voice|number\.voice\)/));
  }
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
