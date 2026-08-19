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

// Amazon Polly's neural voices, which Twilio exposes directly. The
// default Twilio voice is a 2005-era synthesiser and the first thing a
// caller thinks when they hear it is "robot" — which is the whole battle
// on a call like this.
export const VOICE = "Polly.Joanna-Neural";

export function say(text) {
  return `<Say voice="${VOICE}">${esc(text)}</Say>`;
}

/**
 * Speak, then listen.
 *
 * speechTimeout="auto" lets Twilio decide when the caller has stopped
 * talking rather than waiting a fixed number of seconds — the difference
 * between a conversation and an interrogation.
 */
export function sayAndGather({ text, action, timeout = 6, hints = "" }) {
  return wrap(
    `<Gather input="speech" action="${esc(action)}" method="POST" speechTimeout="auto" timeout="${Number(timeout) || 6}" actionOnEmptyResult="true"${
      hints ? ` hints="${esc(hints)}"` : ""
    }>${say(text)}</Gather>`
  );
}

export function sayAndHangUp(text) {
  return wrap(`${say(text)}<Hangup/>`);
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
export function sayAndDial({ text, to, callerId, timeout = 20 }) {
  return wrap(
    `${say(text)}<Dial timeout="${Number(timeout) || 20}" answerOnBridge="true"${
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
