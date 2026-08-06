// Gates owner-only pages (e.g. the referral stats page). Overridable via
// env so this doesn't need a code change if the account owner's email
// ever changes.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "malichiliam@gmail.com";
