// Twilio may call a webhook with GET or with POST, and the two are signed
// differently.
//
// This is not theoretical. The first real call the receptionist ever
// took arrived as a GET; the routes exported POST only, so Next answered
// 405 before any of our code ran, and the caller heard "an application
// error has occurred". Nothing appeared in the logs, because the request
// never reached a handler that could log it.
//
//   node test/voice-method.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";

// voice-request.js builds a Supabase admin client at module load.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
process.env.PUBLIC_BASE_URL = "https://sitebric.com";

const { readTwilioRequest } = await import("../lib/voice-request.js");
const { expectedSignature } = await import("../lib/twilio-signature.js");

const TOKEN = "test-auth-token";
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
async function acheck(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

const CALL = { CallSid: "CA123", From: "+15125550001", To: "+16076383619" };

console.log("\nA GET webhook, signed the way Twilio signs GET");
{
  const query = new URLSearchParams(CALL).toString();
  const publicUrl = `https://sitebric.com/api/voice/incoming?${query}`;
  // No parameters appended: on a GET they are already in the URL.
  const sig = expectedSignature(TOKEN, publicUrl, {});

  await acheck("is accepted", async () => {
    const req = new Request(`https://internal.vercel/api/voice/incoming?${query}`, {
      method: "GET",
      headers: { "x-twilio-signature": sig },
    });
    const out = await readTwilioRequest(req, "/api/voice/incoming");
    assert.ok(out.ok, `rejected: ${out.reason}`);
  });

  await acheck("and its call parameters come back from the query string", async () => {
    const req = new Request(`https://internal.vercel/api/voice/incoming?${query}`, {
      method: "GET",
      headers: { "x-twilio-signature": sig },
    });
    const out = await readTwilioRequest(req, "/api/voice/incoming");
    assert.strictEqual(out.params.CallSid, "CA123");
    assert.strictEqual(out.params.From, "+15125550001");
  });

  await acheck("the signature is over the PUBLIC url, never the request's own host", async () => {
    // Behind Vercel's proxy the request reports an internal host. If the
    // URL were rebuilt from the request, every signature would fail.
    const wrong = expectedSignature(TOKEN, `https://internal.vercel/api/voice/incoming?${query}`, {});
    const req = new Request(`https://internal.vercel/api/voice/incoming?${query}`, {
      method: "GET",
      headers: { "x-twilio-signature": wrong },
    });
    const out = await readTwilioRequest(req, "/api/voice/incoming");
    assert.ok(!out.ok, "a signature over the internal host was accepted");
  });
}

console.log("\nThe two methods are not interchangeable");
{
  await acheck("a GET signed the POST way is rejected", async () => {
    const query = new URLSearchParams(CALL).toString();
    // POST-style: parameters appended to the URL before hashing.
    const postStyle = expectedSignature(TOKEN, `https://sitebric.com/api/voice/incoming?${query}`, CALL);
    const req = new Request(`https://internal.vercel/api/voice/incoming?${query}`, {
      method: "GET",
      headers: { "x-twilio-signature": postStyle },
    });
    const out = await readTwilioRequest(req, "/api/voice/incoming");
    assert.ok(!out.ok, "POST-style signature accepted on a GET");
  });

  await acheck("a POST still works exactly as before", async () => {
    const url = "https://sitebric.com/api/voice/incoming";
    const sig = expectedSignature(TOKEN, url, CALL);
    const body = new URLSearchParams(CALL);
    const req = new Request("https://internal.vercel/api/voice/incoming", {
      method: "POST",
      headers: {
        "x-twilio-signature": sig,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const out = await readTwilioRequest(req, url.replace("https://sitebric.com", ""));
    assert.ok(out.ok, `rejected: ${out.reason}`);
    assert.strictEqual(out.params.To, "+16076383619");
  });

  await acheck("an unsigned GET is still refused", async () => {
    const query = new URLSearchParams(CALL).toString();
    const req = new Request(`https://internal.vercel/api/voice/incoming?${query}`, { method: "GET" });
    const out = await readTwilioRequest(req, "/api/voice/incoming");
    assert.ok(!out.ok, "an unsigned GET was accepted");
  });
}

console.log("\nEvery voice route answers both methods");
{
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  for (const name of ["incoming", "status", "turn"]) {
    const src = read(`../app/api/voice/${name}/route.js`);
    check(`${name} exports POST`, () => assert.match(src, /export const POST = handle;/));
    check(`${name} exports GET`, () => assert.match(src, /export const GET = handle;/));
    check(`${name} routes both to the same handler`, () =>
      assert.match(src, /async function handle\(req\)/));
  }
}

console.log("\nNew numbers are bought with every method stated");
{
  const src = readFileSync(new URL("../lib/twilio-numbers.js", import.meta.url), "utf8");
  for (const key of ["VoiceMethod", "StatusCallbackMethod", "VoiceFallbackMethod"]) {
    check(`${key} is explicit`, () => assert.match(src, new RegExp(`${key}: "POST"`)));
  }
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
