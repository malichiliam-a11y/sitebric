// The voices a receptionist line can speak in.
//
// This is the single biggest lever on "it sounds like a robot", and it is
// not one that can be pulled from a code review — it is decided by
// ringing the number and listening. So it is a per-line setting the owner
// can change themselves, not a constant somebody has to deploy.
//
// Per line rather than per account on purpose: a reseller running a
// locksmith and a hair salon should not have to give them the same voice.
//
// An allowlist rather than free text. The value goes into a TwiML
// attribute, and a name Twilio does not recognise does not error — it
// silently falls back to Twilio's own 2005-era synthesiser, which is
// exactly the robot everyone is trying to get away from. A wrong value
// here is therefore invisible until someone rings and winces.
//
// Honest caveat, worth keeping in the UI too: which of these Twilio
// actually serves can change, and the failure is silent. If one sounds
// robotic it is not available — pick another.

export const DEFAULT_VOICE = "Polly.Joanna-Neural";

export const VOICES = [
  { id: "Polly.Joanna-Neural", label: "Joanna", blurb: "Warm, neutral. The safe one." },
  { id: "Polly.Ruth-Neural", label: "Ruth", blurb: "Newest female voice — usually the most natural." },
  { id: "Polly.Salli-Neural", label: "Salli", blurb: "Lighter and younger." },
  { id: "Polly.Kimberly-Neural", label: "Kimberly", blurb: "Bright and upbeat." },
  { id: "Polly.Kendra-Neural", label: "Kendra", blurb: "Calm, a little lower." },
  { id: "Polly.Matthew-Neural", label: "Matthew", blurb: "Male, steady." },
  { id: "Polly.Stephen-Neural", label: "Stephen", blurb: "Newest male voice." },
  { id: "Polly.Joey-Neural", label: "Joey", blurb: "Male, casual and younger." },
];

const ALLOWED = new Set(VOICES.map((v) => v.id));

/**
 * The voice to actually speak in.
 *
 * Anything not on the list falls back to the default rather than being
 * passed through — an unrecognised name reaches Twilio and comes back as
 * the robot, and a silent downgrade to a voice we know works is better
 * than a silent downgrade to the one we are trying to avoid.
 */
export function voiceFor(value) {
  // Strings only. String(["Polly.Ruth-Neural"]) is "Polly.Ruth-Neural",
  // so a one-element array from a JSON body would sail through a naive
  // check — the same trap already written up for styleById in
  // lib/site-styles.js.
  if (typeof value !== "string") return DEFAULT_VOICE;
  const wanted = value.trim();
  return ALLOWED.has(wanted) ? wanted : DEFAULT_VOICE;
}

export function isKnownVoice(value) {
  return typeof value === "string" && ALLOWED.has(value.trim());
}
