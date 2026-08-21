// What happens to things already sold, once the money stops.
//
// Cancelling used to set plan='none' and stop there. Nothing downstream
// read it: every published site stayed live forever on a cancelled
// account, and every receptionist number kept renting from Twilio every
// month against zero revenue. Someone could pay for one month, publish
// twenty client sites, cancel, and keep the hosting and the phone lines
// indefinitely.
//
// READ THIS BEFORE REUSING ANY OF IT:
//
// This module decides whether something ALREADY SOLD keeps working. It
// deliberately FAILS OPEN — when the answer is unclear it keeps serving.
// Whether someone may CREATE something new (generate a site, buy a
// number, connect a domain) is decided by lib/plans.js, which fails
// CLOSED. They are opposite on purpose and must not be swapped:
//
//   - Wrongly cutting someone off takes a PAYING customer's client's
//     business offline. Their website dies, their phone stops answering,
//     and the reseller finds out from a furious client. Unrecoverable
//     reputational damage to the person paying us.
//   - Wrongly serving costs about $1.15 a month, briefly.
//
// Those are not close, so every uncertain case resolves to "keep
// serving". The one place that rule is inverted is releasing a number,
// which is irreversible, and which therefore waits the longest.

// How long a lapsed account's sites and receptionist keep working.
//
// Not zero, and the reason is Stripe rather than generosity: an expired
// or declined card ends a subscription through exactly the same
// customer.subscription.deleted event as a deliberate cancellation. At
// zero days, a paying customer whose card expired would have every one of
// their clients' sites go dark before they had any chance to notice. The
// grace window is what separates "stopped paying" from "card bounced".
export const GRACE_DAYS = 3;

// How long before a phone number is handed back to Twilio.
//
// Much longer than the grace period because this is the one step that
// cannot be undone: once released, that number is gone, it can be issued
// to somebody else, and any business that pointed their line at it has a
// dead phone. So it waits well past the point where the account has
// clearly gone, and everything cheap and reversible happens first.
export const NUMBER_RELEASE_DAYS = 30;

// Plans whose things are entitled to keep working. The free trial counts:
// a trial is a legitimate state rather than a lapsed one, and its limit
// has always been the number of generations, not a clock.
const LIVE_PLANS = new Set(["trial", "starter", "growth", "pro"]);

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from, to) {
  return (to.getTime() - from.getTime()) / 86400000;
}

/**
 * "active"  — paying, or on trial. Everything works.
 * "grace"   — lapsed within GRACE_DAYS. Everything still works, and the
 *             dashboard says loudly that it is about to stop.
 * "expired" — lapsed longer ago. Sites dark, receptionist silent.
 *
 * Unknown plan, missing date, unparseable date: "active". See the note at
 * the top — this fails open by design.
 */
export function serviceState({ plan, planEndedAt, now = new Date() } = {}) {
  if (LIVE_PLANS.has(String(plan ?? "").trim().toLowerCase())) return "active";

  const ended = toDate(planEndedAt);
  const at = toDate(now) || new Date();
  // No end date means we cannot say it lapsed, so we do not act as if it
  // did. Legacy rows and anything unexpected land here.
  if (!ended) return "active";

  // A date in the future is a clock skew or a bad write, not a lapse.
  if (daysBetween(ended, at) < 0) return "active";

  return daysBetween(ended, at) < GRACE_DAYS ? "grace" : "expired";
}

/** Does a published site still get served? */
export function sitesServe(state) {
  return state !== "expired";
}

/** Does the receptionist still pick up? */
export function receptionistAnswers(state) {
  return state !== "expired";
}

/**
 * Is this account's number due to be handed back to Twilio?
 *
 * Separate from serviceState because it is the irreversible one: it needs
 * an explicit end date and a much longer wait, and it must never be
 * inferred from a plan string alone.
 */
export function numberDueForRelease({ plan, planEndedAt, now = new Date() } = {}) {
  if (LIVE_PLANS.has(String(plan ?? "").trim().toLowerCase())) return false;

  const ended = toDate(planEndedAt);
  const at = toDate(now) || new Date();
  if (!ended) return false;

  return daysBetween(ended, at) >= NUMBER_RELEASE_DAYS;
}

/** Whole days left before things stop working. 0 once they have. */
export function daysOfGraceLeft({ planEndedAt, now = new Date() } = {}) {
  const ended = toDate(planEndedAt);
  const at = toDate(now) || new Date();
  if (!ended) return GRACE_DAYS;
  return Math.max(0, Math.ceil(GRACE_DAYS - daysBetween(ended, at)));
}

/**
 * What the dashboard says. Returned from here rather than written into
 * the component so the sentence and the rule that produces it cannot
 * drift apart.
 */
export function lapsedNotice({ plan, planEndedAt, now = new Date() } = {}) {
  const state = serviceState({ plan, planEndedAt, now });
  if (state === "active") return null;

  if (state === "grace") {
    const left = daysOfGraceLeft({ planEndedAt, now });
    return {
      state,
      urgent: true,
      title:
        left <= 1
          ? "Your clients' sites go offline tomorrow"
          : `Your clients' sites go offline in ${left} days`,
      body:
        "Your plan ended. Every site you've published and every receptionist line stops working when this runs out — including the ones your clients are paying you for. Restart your plan and everything comes straight back.",
    };
  }

  return {
    state,
    urgent: true,
    title: "Your clients' sites are offline",
    body:
      "Your plan ended, so the sites you published are no longer being served and your receptionist lines have stopped answering. Nothing has been deleted — restart your plan and it all comes back within seconds. Phone numbers are given back after " +
      `${NUMBER_RELEASE_DAYS} days, and that part can't be undone.`,
  };
}
