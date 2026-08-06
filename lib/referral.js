const REF_STORAGE_KEY = "sb_ref";

// Captures ?ref=CODE from the URL on landing and remembers it so it's
// still around once the user actually finishes signing up — after an
// email OTP round-trip or a Google OAuth redirect away and back — by
// which point the query param itself is long gone.
export function captureReferralCode() {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref) {
    window.localStorage.setItem(REF_STORAGE_KEY, ref);
  }
}

export function readReferralCode() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REF_STORAGE_KEY);
}

export function clearReferralCode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REF_STORAGE_KEY);
}

// Keeps profiles.referred_by limited to plausible referral codes so a
// malformed or garbage `ref` query param never lands in the database
// as-is. Called server-side, right before the value is stored.
export function sanitizeReferralCode(code) {
  if (typeof code !== "string") return null;
  const trimmed = code.trim().slice(0, 32);
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}
