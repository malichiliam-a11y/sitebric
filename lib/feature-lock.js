// A temporary lock on the receptionist.
//
// Put here at the owner's request, before Shabbat, so nobody is using a
// half-finished feature over a period when he cannot watch it or fix it.
// It is meant to come off — this is a holding measure, not a plan.
//
// Default is LOCKED, deliberately. The request came in as he was stopping
// for the day, so it has to take effect on deploy without him having to
// go and set anything. To lift it: set RECEPTIONIST_LOCKED=0 in Vercel
// (no code change, takes effect on the next request), or delete this
// module's use entirely, which is the tidier end state.
//
// What it locks is the PRODUCT SURFACE — the dashboard tab, the browser
// demo, and buying or changing a number. What it deliberately does NOT
// lock is a line that is already answering. There is a real customer with
// a number on this account, and silently cutting off a business's phone
// because the shop is shut for the weekend is exactly the failure this
// codebase spends most of its comments trying to avoid.

export function receptionistLocked() {
  const raw = String(process.env.RECEPTIONIST_LOCKED ?? "").trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return true;
}

// What a locked-out user is told. Not "error", not "coming soon" — it is
// finished and it works, it is just closed for a day.
export function lockedNotice() {
  return {
    title: "The receptionist is off for a day",
    body: "It's being finished, and it'll be back tomorrow evening. Everything else — sites, leads, domains — is working as normal.",
  };
}
