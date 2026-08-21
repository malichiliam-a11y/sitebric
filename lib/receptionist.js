// What the receptionist says, and when it stops talking and fetches a
// human.
//
// Kept pure and separate from the Twilio routes so the whole conversation
// can be driven in a test without a phone line. The routes are plumbing;
// this file is the product.
//
// Three rules run through all of it, in order of how much damage they
// prevent:
//
//   1. It never states a fact nobody gave it. The same rule the generated
//      sites follow about never inventing a phone number, and it matters
//      more here: a site with a wrong price is embarrassing, an assistant
//      quoting "about two hundred dollars" on a recorded call is a
//      dispute between our customer and theirs.
//   2. It says it is an assistant, in the first sentence. Some places
//      require the disclosure and everywhere it is the difference between
//      a caller who cooperates and one who feels tricked.
//   3. It knows when it is the wrong answer. A burst pipe at 7pm is not a
//      message to be passed on in the morning, and an assistant that
//      cheerfully takes down details while someone's kitchen floods is
//      worse than no answer at all.

// Fast on purpose. Every hundred milliseconds here is silence the caller
// hears after they stop speaking, and on a phone call latency is the
// whole experience — a thoughtful reply that arrives four seconds late is
// a worse reply. Depth is not what a booking call needs.
export const TURN_MODEL = "claude-haiku-4-5-20251001";

// Short on purpose too, and shorter than it was.
//
// The caller cannot interrupt — <Say> finishes before Twilio starts
// listening, which is what stops the assistant transcribing its own voice
// — so every extra word is a word they have to sit through. 160 tokens
// bought rambling replies that took five seconds to read out. A hundred
// is comfortably two spoken sentences.
export const TURN_MAX_TOKENS = 100;

// After this many exchanges the call is not going anywhere useful and is
// costing money on every turn. It wraps up rather than running forever.
export const MAX_TURNS = 16;

// Said before anything else, every call.
export function greetingFor({ businessName, greeting }) {
  const custom = String(greeting || "").trim();
  if (custom) return custom;
  const name = String(businessName || "").trim() || "the office";
  return `Thanks for calling ${name}. I'm the virtual assistant — I can take your details and get someone to call you straight back. What can I help you with?`;
}

/**
 * The rules the assistant works to on a call.
 *
 * `businessFacts` is free text the reseller typed. It is the ONLY thing
 * the assistant may state as fact — deliberately quoted into its own
 * fenced block so the model can tell where the business's information
 * ends and its instructions begin.
 */
export function systemPrompt({ businessName, businessFacts, canForward }) {
  const name = String(businessName || "").trim() || "this business";
  const facts = String(businessFacts || "").trim();

  return `You are answering the telephone for ${name}. You are a virtual assistant, not a person, and you never pretend otherwise — if you are asked whether you are a real person, say plainly that you are an assistant.

BE USEFUL FIRST. This is the part that matters.
If the caller asks something the BUSINESS FACTS below answer, ANSWER IT, straight away and in plain words. The price, the hours, whether you do that kind of job — if it is in the facts, say it. Someone who rings and asks "how much is a call-out" and is told "I'll pass that on" has been given nothing, and will ring somebody else. Answering is the whole reason you are on this call.
Answer the question first, then carry on taking their details. Not the other way round.

WHEN YOU DO NOT KNOW
If the facts do not cover what they asked, say so in one short sentence — you will have someone confirm it when they call back — and move on. Do NOT guess and do NOT hedge at length.
Never state a price, a time slot, an availability, a warranty, a policy, a licence or a service area that is not in the facts. You are on a recorded line speaking for someone else's business, and an invented price is a dispute between them and their customer.
Never invent a phone number, an address, an email or a name.

WHAT TO COME AWAY WITH
Their name, a number to call them back on, and what they need — in enough detail that whoever rings back knows what they are walking into. Ask one question at a time, and do not interrogate: if they have already told you what they need, do not ask again.

HOW TO SPEAK
- One or two short sentences. Never more. They cannot interrupt you and they cannot re-read you.
- Talk like a helpful person on a phone, not like a form. Contractions, plain words.
- No lists, no bullet points, no headings, no emoji, no asterisks — every character you write is read aloud.
- Say numbers the way a person says them: "five one two, five five five, oh one four two".
- Do not repeat back what you just said, and do not thank them twice.

${
  canForward
    ? `WHEN TO HAND OVER
If the caller asks for a person, sounds distressed, or describes something that cannot wait — a leak, flooding, no heat in winter, a lockout, smoke, a burst pipe, anything they call an emergency — stop taking details and put them through. To do that, reply with exactly this and nothing else: [[TRANSFER]]`
    : `WHEN THERE IS NOBODY TO HAND OVER TO
Nobody is available to take the call directly, so do NOT offer to put anyone through. If it is urgent, say you are marking it urgent and get their number first — on an urgent call the number is the only thing that matters.`
}

WHEN YOU ARE DONE
Once you have their name, their number and what they need, read the number back digit by digit to check it, then say someone will call them back shortly. Then reply with exactly this and nothing else: [[DONE]]
Do not end the call while they are still asking things. Answer them first.

BUSINESS FACTS — everything here is true and you may say any of it freely:
"""
${facts || "(Nothing was provided. You may not state anything about this business beyond its name — not its hours, prices, services, or location. Say so honestly, take the caller's details, and tell them someone will call back with the answers.)"}
"""`
}

// The model signals what happens next with a bare token rather than by
// being parsed for intent. Anything looser turns "I'll transfer you now"
// said conversationally into an actual transfer.
const TRANSFER = "[[TRANSFER]]";
const DONE = "[[DONE]]";

/**
 * Turns a raw model reply into what the call should do.
 *
 * Returns { action: "speak" | "transfer" | "finish", text }.
 */
export function interpretReply(raw, { canForward = true } = {}) {
  const reply = String(raw || "").trim();

  if (reply.includes(TRANSFER)) {
    // Ignored when there is nobody to transfer to. The prompt says not to
    // ask, but a model that does it anyway must not dial an empty number
    // and drop the call.
    if (!canForward) {
      return {
        action: "speak",
        text: "Let me take your number and I'll have someone call you straight back. What's the best number for you?",
      };
    }
    return { action: "transfer", text: "" };
  }

  const finished = reply.includes(DONE);
  const spoken = cleanForSpeech(reply.split(DONE)[0]);

  if (finished) {
    return {
      action: "finish",
      text: spoken || "Thanks very much — someone will call you back shortly. Goodbye.",
    };
  }

  return {
    action: "speak",
    text: spoken || "Sorry, I didn't catch that. Could you say that again?",
  };
}

/**
 * Strips anything that would be read out literally.
 *
 * A stray asterisk becomes the word "asterisk" in the caller's ear, and a
 * markdown list becomes "dash, dash, dash". The prompt asks for none of
 * it; this is the belt to that braces.
 */
export function cleanForSpeech(text) {
  return String(text || "")
    .replace(/\[\[[A-Z_]+\]\]/g, "")
    .replace(/[*_`#]+/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

// Silence is the most common thing a caller "says". Twilio posts an empty
// SpeechResult when it hears nothing, and the right response is not to
// ask the same question again forever.
export function silenceReply(consecutiveSilences) {
  if (consecutiveSilences >= 2) {
    return {
      action: "finish",
      text: "I can't hear anything, so I'll let you go. Please call back when you can. Goodbye.",
    };
  }
  return { action: "speak", text: "Sorry, I didn't catch that — are you still there?" };
}

// Reached the turn ceiling. Ends deliberately rather than being cut off.
export function outOfTurnsReply() {
  return {
    action: "finish",
    text: "I'll pass all of that on and have someone call you back shortly. Thanks very much.",
  };
}

/**
 * The prompt that turns a finished transcript into a row someone can act
 * on. Separate from the call itself: this one is not latency-critical and
 * can afford to be careful.
 */
export function summaryPrompt(transcript) {
  const lines = (Array.isArray(transcript) ? transcript : [])
    .map((t) => `${t.role === "caller" ? "Caller" : "Assistant"}: ${t.text}`)
    .join("\n");

  return `Here is a transcript of a call answered by a virtual receptionist.

"""
${lines || "(no words were exchanged)"}
"""

Return ONLY a JSON object, no other text, with exactly these keys:
{"caller_name": "", "callback_number": "", "summary": "", "urgency": "low" | "normal" | "urgent"}

Rules:
- Use "" for anything the caller did not actually say. Do not guess a name from the phone number, and do not infer a number that was never spoken.
- "callback_number" must be digits as spoken, e.g. "512 555 0142". If they never gave one, "".
- "summary" is one or two plain sentences telling the business what this person wants, written so someone can read it and pick up the phone knowing what to say. No preamble.
- "urgency" is "urgent" only for something that genuinely cannot wait — a leak, flooding, no heat, a lockout, smoke. Being keen is not urgent.`;
}

/**
 * Reads the summary model's reply. Never throws: a failed parse must
 * still leave the business with the transcript and the caller's number
 * from Twilio, which is most of the value.
 */
export function parseSummary(raw) {
  const text = String(raw || "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const fallback = { caller_name: "", callback_number: "", summary: "", urgency: "normal" };
  if (start === -1 || end <= start) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return fallback;
  }

  const str = (v, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const urgency = str(parsed.urgency, 10).toLowerCase();

  return {
    caller_name: str(parsed.caller_name, 80),
    callback_number: str(parsed.callback_number, 40),
    summary: str(parsed.summary, 600),
    urgency: ["low", "normal", "urgent"].includes(urgency) ? urgency : "normal",
  };
}

// What a caller hears when the month's minutes are gone.
//
// It must never sound like the business is shut — that costs them the
// job, which is the opposite of what they are paying for. It also must
// not promise a tone to speak after: nothing is recording. It doesn't
// need to. Twilio hands us the caller's number with the request, so the
// call is still logged and the business still gets told who rang.
export function overLimitMessage(businessName) {
  const name = String(businessName || "").trim();
  return `Thanks for calling ${name || "us"}. We can't take your call this second, but we've got your number and someone will call you straight back. Sorry to keep you.`;
}

// ===== The public demo line =====
//
// One number anyone can ring, including people who have never signed up.
// It is the only number in the system a stranger can reach, which makes
// it the only one that needs protecting from strangers.

// Shorter than a real call. A demo needs to prove it works, not book a
// job, and every turn on a public line is money spent on someone who may
// just be poking it.
// Was 6, which was too tight to be a demo of anything.
//
// On the first real call, three of those six went to the assistant
// transcribing its own greeting, so the ceiling was hit at the exact
// moment the caller asked a real question — and what they heard was the
// canned "I'll pass all of that on", which reads as the assistant
// dodging. The echo is fixed, but six was never enough for someone
// poking at it to be convinced by it.
export const DEMO_MAX_TURNS = 12;

// How many times one phone may ring the demo in a day. Three is enough to
// try it, show a friend, and try again after changing something — and low
// enough that a bored caller cannot run up a bill.
export const DEMO_CALLS_PER_DAY = 3;

// What someone hears once they have had their three. It must not sound
// broken, because the person hearing it is a prospect.
export function demoLimitMessage() {
  return "Thanks for calling the Sitebric demo. You have had a few goes today, so I will let you go — have a look at sitebric dot com to set one up for a business of your own. Thanks very much.";
}
