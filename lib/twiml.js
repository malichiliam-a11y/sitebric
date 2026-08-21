import { voiceFor } from "./voices.js";

// The XML Twilio reads back to say what happens next on the call.
//
// Everything here is built by hand rather than with a library because
// there are five verbs in play and exactly one thing that can go wrong —
// and that one thing is worth owning outright.
//
// The thing: a caller's own words end up inside these documents. Someone
// saying "me & my wife" or a business called "Smith < Sons" produces a
// raw & or < in the XML. Twilio's parser rejects the whole document, the
// call drops mid-sentence, and it looks like the product broke rather
// than like an escaping bug. Nothing in this file interpolates a string
// without going through esc().

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not legal in XML 1.0 at all, and no escape
    // sequence for them exists — they have to be dropped. Speech
    // transcription has produced them.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

// Which voice speaks.
//
// The account-wide default. A line can override it — see lib/voices.js
// — because which voice sounds human is decided by ringing the number,
// not in a code review, and different clients want different voices.
//
// The default Twilio voice is a 2005-era synthesiser and the first thing
// a caller thinks when they hear it is "robot", which is the whole battle
// on a call like this. An unrecognised name falls back to exactly that,
// silently, which is why every value goes through voiceFor().
export const VOICE = voiceFor(process.env.RECEPTIONIST_VOICE);

export function say(text, voice) {
  return `<Say voice="${esc(voiceFor(voice) || VOICE)}">${esc(text)}</Say>`;
}

/**
 * Speak, THEN listen. In that order, and the order is the whole point.
 *
 * <Say> is a sibling before <Gather>, never nested inside it. Nesting is
 * Twilio's barge-in mode: recognition starts while the prompt is still
 * playing, so on any line with echo — which is most phone lines — the
 * assistant hears itself and transcribes its own voice as the caller.
 *
 * That is not theoretical. On the first real call this product took, the
 * transcript opened:
 *
 *   assistant: "Thanks for calling the office. I'm the virtual assistant"
 *   caller:    "Thanks for calling the office."
 *   assistant: "Hi there! Thanks for calling Northgate Locksmiths."
 *   caller:    "Hi there. Thanks for"
 *
 * Three turns gone before the caller got a word in, against a ceiling
 * that then ended the call early. It read as a stupid assistant; it was
 * an assistant talking to itself.
 *
 * The cost of fixing it this way is that a caller cannot interrupt a
 * reply, which is a real cost and the reason replies are kept to a
 * sentence or two.
 *
 * speechTimeout="auto" lets Twilio decide when the caller has stopped
 * talking rather than waiting a fixed number of seconds — the difference
 * between a conversation and an interrogation.
 */
export function sayAndGather({ text, action, timeout = 6, hints = "", voice }) {
  return wrap(
    `${say(text, voice)}<Gather input="speech" action="${esc(action)}" method="POST" speechTimeout="auto" timeout="${Number(timeout) || 6}" actionOnEmptyResult="true"${
      hints ? ` hints="${esc(hints)}"` : ""
    }/>`
  );
}

export function sayAndHangUp(text, voice) {
  return wrap(`${say(text, voice)}<Hangup/>`);
}

/**
 * Hand the call to a human.
 *
 * The caller hears why first — a call that goes silent and then starts
 * ringing again sounds like a fault. `callerId` is the receptionist
 * number rather than the caller's, so the business sees which of their
 * lines rang; `answerOnBridge` means the caller hears real ringing
 * instead of silence while it connects.
 */
export function sayAndDial({ text, to, callerId, timeout = 20, voice }) {
  return wrap(
    `${say(text, voice)}<Dial timeout="${Number(timeout) || 20}" answerOnBridge="true"${
      callerId ? ` callerId="${esc(callerId)}"` : ""
    }>${esc(to)}</Dial>`
  );
}

function wrap(body) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export function twimlResponse(xml) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      // A cached TwiML document would replay the previous turn of the
      // conversation to the next caller.
      "Cache-Control": "no-store",
    },
  });
}
