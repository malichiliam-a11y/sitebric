const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];
const STORAGE_PREFIX = "sb_";

// Same shape as lib/referral.js: capture on landing, read once at signup,
// clear after. Only overwrites a key when the URL actually carries it, so
// a later organic visit before signup completes can't blank out an
// earlier campaign attribution.
export function captureUtmParams() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) window.localStorage.setItem(STORAGE_PREFIX + key, value);
  }
}

// Landing pages that know where they sit in the funnel stamp their own
// attribution, so a visitor who arrives with a bare URL still gets counted
// against the page that convinced them. Deliberately yields to anything
// already captured: a real campaign tag from the URL is better data than a
// default, and same-invariant as captureUtmParams — never blank out an
// earlier attribution.
export function captureDefaultUtm({ source, medium, campaign }) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(STORAGE_PREFIX + "utm_source")) return;
  if (source) window.localStorage.setItem(STORAGE_PREFIX + "utm_source", source);
  if (medium) window.localStorage.setItem(STORAGE_PREFIX + "utm_medium", medium);
  if (campaign) window.localStorage.setItem(STORAGE_PREFIX + "utm_campaign", campaign);
}

export function readUtmParams() {
  if (typeof window === "undefined") return {};
  const result = {};
  for (const key of UTM_KEYS) {
    result[key] = window.localStorage.getItem(STORAGE_PREFIX + key);
  }
  return result;
}

export function clearUtmParams() {
  if (typeof window === "undefined") return;
  for (const key of UTM_KEYS) {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  }
}

// Keeps profiles.utm_* limited to plausible values so a malformed or
// garbage query param never lands in the database as-is. Called
// server-side, right before the value is stored. Unlike referral codes,
// UTM values are meaningful lowercase (e.g. "cpc", "spring_sale") so this
// doesn't force a case change.
export function sanitizeUtmValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 64);
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return null;
  return trimmed;
}
