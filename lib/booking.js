// Booking a time, over the phone.
//
// The honest constraint: an assistant on a call cannot fill in a booking
// form, and reading live availability aloud would mean holding a calendar
// token for every client of every reseller. So it texts the link instead.
// The caller has it on their phone before they hang up, and it works with
// Calendly, Cal.com, Acuity, Square or whatever page the business already
// uses — nothing to integrate, nothing to keep working when a provider
// changes their API.
//
// This module is pure. Sending lives in lib/twilio-sms.js.

/**
 * A booking link we are willing to text to a stranger.
 *
 * https only. A link is being sent from the business's own number to
 * someone who just rang them, so it carries the business's credibility —
 * an http link, a javascript: URL or anything with credentials embedded
 * is not something to put in that message. Anything not clean returns "",
 * which turns the feature off for that line rather than sending something
 * dubious.
 */
export function bookingUrl(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw || raw.length > 500) return "";

  let url;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }

  if (url.protocol !== "https:") return "";
  // Credentials in a URL are either a mistake or an attack, and either
  // way not something to send to a customer.
  if (url.username || url.password) return "";
  // A hostname with no dot is not a public booking page.
  if (!url.hostname.includes(".")) return "";

  return url.toString();
}

export function hasBooking(value) {
  return bookingUrl(value) !== "";
}

/**
 * The text message. Short on purpose — it is read on a lock screen,
 * usually by someone standing outside a car.
 *
 * The business's name leads, because an unexplained link from an unknown
 * number is a link nobody taps.
 */
export function bookingSms({ businessName, url }) {
  const link = bookingUrl(url);
  if (!link) return "";
  const name = String(businessName || "").trim();
  return `${name ? `${name}: ` : ""}here's the link to pick a time — ${link}`;
}

// What the assistant says once the text is on its way. Said out loud, so
// no URL in it: nobody writes down a link read to them by a phone.
export function bookingSpoken() {
  return "Just texted you the link to pick a time.";
}

// And what it says when the text could not be sent. It must not claim to
// have done something it did not do — the caller would sit waiting for a
// message that never arrives.
export function bookingFailedSpoken() {
  return "I couldn't get that text out just now, but someone will call you straight back to sort a time.";
}
