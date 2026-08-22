// The receptionist is temporarily off. Everything, everyone.
//
// The first version of this lock exempted the owner and left live phone
// lines answering. That was put to the owner and he asked for it off
// completely until he gives the word, so every entry point is shut — and
// "every" is the whole point of this file. A lock with one door left open
// is not a lock, and the open door is invisible until somebody walks
// through it.
//
//   node test/feature-lock.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";

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

console.log("\nThe switch");
{
  // Imported fresh per case: the module reads the environment at call
  // time, and a stale import would test the wrong thing.
  const load = async () => (await import("../lib/feature-lock.js")).receptionistLocked;

  check("it exists at all", () => assert.ok(read("../lib/feature-lock.js").length > 0));

  const locked = await load();
  check("unset means LOCKED — it has to hold without anyone setting it", () => {
    delete process.env.RECEPTIONIST_LOCKED;
    assert.strictEqual(locked(), true);
  });
  for (const off of ["0", "false", "off", "no", "OFF", " 0 "]) {
    check(`${JSON.stringify(off)} lifts it`, () => {
      process.env.RECEPTIONIST_LOCKED = off;
      assert.strictEqual(locked(), false);
    });
  }
  for (const on of ["1", "true", "yes", "", "banana"]) {
    check(`${JSON.stringify(on)} keeps it locked`, () => {
      process.env.RECEPTIONIST_LOCKED = on;
      assert.strictEqual(locked(), true);
    });
  }
  delete process.env.RECEPTIONIST_LOCKED;
}

console.log("\nEvery door");
{
  const doors = [
    ["the dashboard's API", "../app/api/receptionist/route.js"],
    ["the browser demo's API", "../app/api/demo-receptionist/route.js"],
    ["the /try page", "../app/try/page.js"],
    ["an incoming phone call", "../app/api/voice/incoming/route.js"],
    ["a call already in flight", "../app/api/voice/turn/route.js"],
  ];
  for (const [name, file] of doors) {
    check(`${name} is shut`, () => assert.match(read(file), /receptionistLocked\(\)/));
  }

  // The read being locked is not enough. A saved request replayed from a
  // console would otherwise still buy a phone number.
  const api = read("../app/api/receptionist/route.js");
  check("every verb refuses, not just the read", () => {
    const gates = (api.match(/receptionistLocked\(\)/g) || []).length;
    assert.ok(gates >= 4, `only ${gates} gates for GET/POST/PATCH/DELETE`);
  });

  check("no owner exemption survives on the lock itself", () =>
    assert.ok(
      !/receptionistLocked\(\)\s*&&\s*!isOwner/.test(api),
      "the owner can still get through — he asked for it off for everyone"
    ));
}

console.log("\nWhat a caller hears");
{
  const { lockedCallerMessage, lockedNotice } = await import("../lib/feature-lock.js");
  const msg = lockedCallerMessage();
  const incoming = read("../app/api/voice/incoming/route.js");

  // The person on the phone is some business's customer. None of this is
  // their fault and none of it is that business's fault.
  for (const word of ["sitebric", "out of service", "disabled", "locked", "maintenance", "error"]) {
    check(`it doesn't say "${word}"`, () =>
      assert.ok(!new RegExp(word, "i").test(msg), msg));
  }
  check("it doesn't make the business sound shut down", () =>
    assert.ok(!/closed|shut|no longer/i.test(msg), msg));
  check("it suggests trying again", () => assert.match(msg, /try again/i));

  // A customer with a real problem should still reach a human where
  // there is a human to reach. That is the AI not answering, which is
  // what was asked — not the call being thrown away.
  check("a line with a mobile still puts the caller through", () =>
    assert.match(incoming, /receptionistLocked\(\)[\s\S]{0,700}number\.forward_to[\s\S]{0,300}sayAndDial/));

  check("and one without gets the neutral sentence, not silence", () =>
    assert.match(incoming, /receptionistLocked\(\)[\s\S]{0,900}lockedCallerMessage\(\)/));

  check("the lock is checked before anything that costs money", () => {
    // The CALL SITE, not the import at the top of the file — comparing
    // against the import made this pass or fail on where the import
    // happened to sit.
    const lockAt = incoming.indexOf("if (receptionistLocked())");
    const greetAt = incoming.indexOf("greetingFor({");
    const rowAt = incoming.indexOf('.upsert(');
    assert.ok(lockAt > -1, "no lock in the incoming route");
    assert.ok(lockAt < greetAt, "a locked call still reaches the greeting");
    assert.ok(lockAt < rowAt, "a locked call still writes a call record");
  });

  check("a Sitebric user is told when it comes back", () =>
    assert.match(lockedNotice().body, /tomorrow/i));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
