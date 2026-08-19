// Gates owner-only pages (e.g. the referral stats page). Overridable via
// env so this doesn't need a code change if the account owner's email
// ever changes.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "malichiliam@gmail.com";

/**
 * The owner always has the run of their own product.
 *
 * Sitebric's own account is on a real Stripe subscription like anyone
 * else's, which meant the receptionist — gated to Growth and Pro —
 * locked the owner out of the feature they had just paid to have built.
 * Upgrading the row by hand would have worked until the next Stripe
 * webhook quietly reset it, which is the worst kind of fix: one that
 * fails weeks later, mid-demo.
 *
 * Read from ADMIN_EMAIL, the same env var that gates /admin, rather than
 * a hardcoded address — this repository is public.
 */
export function isOwner(email) {
  const admin = String(ADMIN_EMAIL || "").trim().toLowerCase();
  const who = String(email || "").trim().toLowerCase();
  return Boolean(admin && who && who === admin);
}
