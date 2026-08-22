// A temporary lock on the receptionist. Everything, everyone, no
// exceptions.
//
// Put here at the owner's request, before Shabbat, so nobody is using a
// half-finished feature over a period when he cannot watch it or fix it.
// It is meant to come off — this is a holding measure, not a plan.
//
// The first version of this exempted the owner and left live phone lines
// answering, on the reasoning that cutting off a real business's phone is
// the worst thing this codebase can do. That reasoning was put to him and
// he asked for it off completely, until he gives the word. So it is off
// completely: the dashboard tab, the browser demo, provisioning, the
// owner's own account, and the phone lines themselves.
//
// A caller therefore does NOT reach the assistant. Where the business has
// given a mobile the call is put through to it, because a customer of
// theirs with a real problem should still reach a human — that is the
// call not being answered by an AI, which is what was asked, rather than
// the call being thrown away. Where there is no mobile, they hear one
// neutral sentence: no "out of service", no mention of Sitebric, nothing
// that makes the business look shut.
//
// Default is LOCKED, deliberately. The request came in as he was
// stopping, so it has to hold without him setting anything. To lift it:
// RECEPTIONIST_LOCKED=0 in Vercel, read per request, no deploy needed —
// or delete this module's use, which is the tidier end state.

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

// What a caller hears when there is no mobile to put them through to.
//
// Written for a stranger ringing a business, not for a Sitebric user. It
// does not say "out of service", does not name us, and does not suggest
// the business has closed down — none of which is that business's fault
// or their customer's problem.
export function lockedCallerMessage() {
  return "Thanks for calling. We can't take your call at the moment — please try again a little later.";
}
