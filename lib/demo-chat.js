// The receptionist you can talk to in a browser, without a phone.
//
// It exists because of a funnel problem with a number on it: most people
// who sign up never ring the demo line, so most people never hear the
// thing they are being asked to sell. A button is a different proposition
// to a phone number.
//
// The important design decision: this runs the SAME systemPrompt as a
// real call, against the same fenced business facts. It is a demo of the
// product, not a separate toy that behaves better than the thing people
// buy. If the demo answers a question well and the phone line does not,
// the demo is a lie.

// A fictional business, chosen to make the guardrail visible.
//
// The facts are specific enough to answer real questions with, and
// deliberately incomplete: there is nothing here about card payments,
// weekends, or how long a job takes. Ask about those and it says someone
// will confirm — which is the behaviour that makes this safe to sell for
// somebody else's business, and the thing a prospect most needs to see.
export const DEMO_BUSINESS = "Northgate Locksmiths";

export const DEMO_FACTS = `Open 8am to 6pm, Monday to Saturday.
Emergency call-outs 24/7.
Call-out fee is $89, waived if you go ahead and book the work.
We do car lockouts, house lockouts, lock changes, rekeys and safes.
We cover Austin and about 20 miles around it.
We don't do commercial alarm systems or CCTV.`;

// Per browser conversation. Long enough to be convinced, short enough
// that a bored visitor cannot run up a bill.
export const DEMO_CHAT_MAX_TURNS = 10;

// Per IP per day, across conversations. The real ceiling on cost.
export const DEMO_CHAT_TURNS_PER_DAY = 40;

// What it opens with. Static, so the first thing a visitor sees appears
// instantly rather than after a model call — the moment the page feels
// slow is the moment they leave.
export function demoGreeting() {
  return `Thanks for calling ${DEMO_BUSINESS}, this is the assistant — what can I help you with?`;
}

// Shown under the orb, so a visitor knows what to say. Without these
// almost everyone says "hello" and then runs out of ideas.
export const DEMO_PROMPTS = [
  "How much is a call-out?",
  "I'm locked out of my car",
  "Do you take card payments?",
  "Are you open on Sunday?",
];

export function outOfTurnsMessage() {
  return `That's the demo — but that's exactly how it answers a real customer. Set one up for a business of your own and it'll know their prices instead of ours.`;
}

export function rateLimitedMessage() {
  return `The demo's had a lot of use today. Give it a few hours, or set one up for a business of your own and try it properly.`;
}

/**
 * Trims a browser conversation to what gets sent to the model.
 *
 * Anything arriving from a browser is untrusted: the transcript is posted
 * back on every turn, so a caller could otherwise send a thousand
 * messages, or claim the assistant already agreed to something. Roles are
 * forced to the two we accept, text is capped, and the whole thing is
 * capped — the ceiling is enforced here rather than trusted from the
 * client.
 */
export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .slice(-DEMO_CHAT_MAX_TURNS * 2)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      text: m.text.trim().slice(0, 500),
    }));
}

/** How many turns the visitor has actually taken. */
export function turnsUsed(history) {
  return sanitizeHistory(history).filter((m) => m.role === "user").length;
}
