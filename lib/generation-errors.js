// Raw model-API errors must never reach a reseller or a demo visitor.
//
// This shipped for real: the account ran out of API credit and the message
// Anthropic returns — "Your credit balance is too low to access the
// Anthropic API. Please go to Plans & Billing to upgrade or purchase
// credits." — was rendered straight into the dashboard. That message is
// addressed to us, the API customer. Shown verbatim it tells a paying
// reseller to go buy credits from a vendor they have no relationship with,
// and on /demo it tells a stranger evaluating the product that its billing
// is broken. Both routes had a "temporarily returning the real error so we
// can debug" shim that outlived the debugging.
//
// The real error is still logged server-side on every path — this only
// changes what the browser is told.

// Thrown deliberately when the text IS safe and actionable for the person
// who asked for the site (e.g. "the brief was too long"). Anything else is
// treated as internal and replaced.
export class UserFacingError extends Error {}

const BUSY =
  "Sitebric is at capacity right now. It didn't use up one of your generations — please try again in a few minutes.";

export function friendlyGenerationError(err) {
  if (err instanceof UserFacingError) return err.message;

  const raw = String(err?.message || "");
  const status = err?.status;

  // Our own account is out of credit or over quota. Deliberately worded as
  // our problem, because it is — the reseller can do nothing about it, and
  // telling them to check their billing sends them to cancel a plan that
  // is working fine.
  if (/credit balance|billing|insufficient|quota|payment/i.test(raw)) return BUSY;

  // Rate limited or the model is overloaded — genuinely transient.
  if (status === 429 || status === 529 || /rate.?limit|overloaded/i.test(raw)) return BUSY;

  // Our own deadline fired, or the multi-page builder could not make sense
  // of what came back. Both mean we stopped rather than the vendor did.
  if (/^multipage_/.test(raw)) {
    return "This four-page site didn't come together cleanly. It didn't use up one of your generations — please try again, or generate it as a single-page site.";
  }
  if (err?.name === "AbortError" || /abort/i.test(raw)) {
    return "This site took longer than the time limit allows. It didn't use up one of your generations — try a shorter brief, or generate it as a single-page site.";
  }

  // The connection died rather than the request being refused.
  if (/timeout|timed out|ECONNRESET|socket hang up|fetch failed|aborted/i.test(raw)) {
    return "The connection dropped while this site was being built. It didn't use up one of your generations — please try again.";
  }

  return "Something went wrong while building this site. It didn't use up one of your generations — please try again.";
}
