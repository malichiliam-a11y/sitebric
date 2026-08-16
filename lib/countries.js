// ISO 3166-1 alpha-2 codes, which is exactly what Google Places wants for
// regionCode (it takes CLDR two-character codes).
//
// Only the codes are stored. Display names come from Intl.DisplayNames in
// the browser, so the list never goes stale in one language and never has
// to carry 250 translated strings.
export const COUNTRY_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
];

const CODE_SET = new Set(COUNTRY_CODES);

// Both of these arrive from a request body or a proxy header, so neither is
// trusted: anything not on the list above is dropped rather than forwarded
// to Google.
export function isValidCountryCode(code) {
  return typeof code === "string" && CODE_SET.has(code.toUpperCase());
}

export function sanitizeCountryCode(code) {
  return isValidCountryCode(code) ? code.toUpperCase() : null;
}

// Google wants a two-letter ISO 639-1 code, optionally with a region
// suffix. Only the primary subtag is kept, so "en-GB" and "pt-BR" both
// reduce to something the API definitely accepts.
export function sanitizeLanguageCode(value) {
  if (typeof value !== "string") return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(primary) ? primary : null;
}

// Browser-side default for the picker. Only regions the tag actually
// states are used: "en-GB" gives GB, while a bare "en" gives nothing and
// falls through to the server's country header.
//
// Deliberately not maximize(). That fills in a region from CLDR likely-
// subtags, turning "en" into US — so a British user whose browser reports
// a bare "en" would send US and override the correct IP-based answer. A
// guess that overrides better evidence is worse than no guess.
export function guessCountryFromBrowser() {
  if (typeof navigator === "undefined") return null;
  const tags = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const tag of tags) {
    try {
      const region = new Intl.Locale(tag).region;
      if (isValidCountryCode(region)) return region.toUpperCase();
    } catch {
      // Intl.Locale throws on a malformed tag — try the next one.
    }
  }
  return null;
}

export function countryLabel(code) {
  try {
    const names = new Intl.DisplayNames(undefined, { type: "region" });
    return names.of(code) || code;
  } catch {
    return code;
  }
}
