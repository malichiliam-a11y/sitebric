// What a connected custom domain is actually doing right now.
//
// The dashboard used to print "Connected domain: theirsite.com" the
// instant the row was written, which was a lie: connecting registers the
// domain with Vercel, and registering does nothing until the domain's
// nameservers actually point at Vercel. A reseller saw the word
// "connected", told their client it was done, and then had to explain
// twelve hours of a dead website they had already been paid for.
//
// So this reads the real state out of Vercel and names it. The two facts
// that matter, and the only two this file trusts:
//
//   verified      — Vercel accepts that we own the domain. False when the
//                   domain is already attached to a different Vercel
//                   account, which needs a TXT record to break the tie.
//   misconfigured — DNS is not pointing here yet. This is the one that is
//                   true for hours after a nameserver change, and it is
//                   the state every "it doesn't work" question is about.
//
// Anything else Vercel returns is treated as a nice-to-have: shapes drift,
// and a status screen that throws because an optional field moved is worse
// than one that says "still pointing somewhere else".

// What Sitebric tells people to set. Also what the dashboard prints, so
// the instructions and the check can't drift apart.
export const VERCEL_NAMESERVERS = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

export const DOMAIN_STATES = {
  NONE: "none",
  LIVE: "live",
  WAITING_FOR_DNS: "waiting_for_dns",
  NEEDS_VERIFICATION: "needs_verification",
  UNKNOWN: "unknown",
};

function list(value) {
  return Array.isArray(value) ? value : [];
}

// Nameservers as a registrar shows them: lowercase, no trailing dot.
function cleanNs(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

// Whether the domain's current nameservers are Vercel's.
//
// Kept separate from `misconfigured` because the two answer different
// questions and fail at different times: nameservers flip within hours of
// the registrar change, but Vercel can still report misconfigured for a
// while after that while it provisions. Someone staring at the screen
// needs to know the difference between "you haven't done it yet" and
// "you've done it, wait".
export function nameserversPointHere(nameservers) {
  const current = list(nameservers).map(cleanNs).filter(Boolean);
  if (!current.length) return null; // Not known — don't guess.
  return current.some((ns) => ns.endsWith("vercel-dns.com"));
}

// The verification record Vercel wants, when it wants one. Returned as
// something a person can copy rather than as Vercel's raw shape.
function verificationRecord(verification) {
  const txt = list(verification).find((v) => v && v.type === "TXT" && v.domain && v.value);
  if (!txt) return null;
  return { type: "TXT", name: String(txt.domain), value: String(txt.value) };
}

// One state, from whatever Vercel gave us.
//
// `domainInfo`  — GET /v9/projects/{project}/domains/{domain}
// `configInfo`  — GET /v6/domains/{domain}/config
// Either may be null when the call failed; that is UNKNOWN, never LIVE.
// Reporting "live" for a site nobody can reach is the failure this whole
// file exists to prevent, so every uncertain path resolves downwards.
export function domainStatus({ domain, domainInfo, configInfo } = {}) {
  const name = String(domain ?? "").trim().toLowerCase();
  if (!name) return { state: DOMAIN_STATES.NONE, domain: "" };

  const base = {
    domain: name,
    nameservers: VERCEL_NAMESERVERS,
    currentNameservers: list(configInfo?.nameservers).map(cleanNs).filter(Boolean),
  };
  base.pointingHere = nameserversPointHere(base.currentNameservers);

  if (!domainInfo || !configInfo) {
    return { ...base, state: DOMAIN_STATES.UNKNOWN };
  }

  // Ownership first: while this is outstanding nothing else can resolve,
  // and the fix is a record only they can add.
  if (domainInfo.verified === false) {
    return {
      ...base,
      state: DOMAIN_STATES.NEEDS_VERIFICATION,
      record: verificationRecord(domainInfo.verification),
    };
  }

  // `misconfigured` is the whole question for a domain that was set up
  // correctly ten minutes ago. Anything other than an explicit false is
  // treated as "not yet" — see the note above about resolving downwards.
  if (configInfo.misconfigured !== false) {
    return { ...base, state: DOMAIN_STATES.WAITING_FOR_DNS };
  }

  return { ...base, state: DOMAIN_STATES.LIVE };
}

// The sentence the dashboard shows. Here rather than in the component so
// the wording is testable, and so it says the same thing everywhere.
export function domainMessage(status) {
  const s = status || {};
  switch (s.state) {
    case DOMAIN_STATES.LIVE:
      return "Live. Anyone typing this domain sees the site.";

    case DOMAIN_STATES.NEEDS_VERIFICATION:
      return "This domain is already attached to another account. Add the TXT record below at your registrar to prove it's yours.";

    case DOMAIN_STATES.WAITING_FOR_DNS:
      // Three different situations wear the same badge, and the useful
      // half of the message is which one this is.
      if (s.pointingHere === true) {
        return "Nameservers are pointing here — the last step is running now. This usually finishes within an hour.";
      }
      if (s.pointingHere === false) {
        return `Not pointing here yet. This domain still uses ${s.currentNameservers
          .slice(0, 2)
          .join(" and ")}, so change the nameservers at your registrar to the two below.`;
      }
      return "Not pointing here yet. Set the domain's nameservers at your registrar to the two below, then give it a few hours.";

    case DOMAIN_STATES.UNKNOWN:
      return "Couldn't check this domain just now. The site itself is unaffected — try again in a minute.";

    default:
      return "";
  }
}

// Whether it's worth showing the nameserver instructions. Once a domain is
// live they are noise, and leaving setup steps on screen forever is how a
// working thing gets "fixed" until it breaks.
export function showsSetup(status) {
  return (
    status?.state === DOMAIN_STATES.WAITING_FOR_DNS ||
    status?.state === DOMAIN_STATES.NEEDS_VERIFICATION
  );
}
