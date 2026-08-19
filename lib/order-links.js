// Online ordering links for a restaurant's site.
//
// Entered by the reseller, never guessed. A fabricated DoorDash URL is the
// same class of failure as the fabricated phone numbers this codebase
// already guards against — worse, in fact, because a wrong delivery link
// sends a hungry customer to someone else's restaurant, and the owner
// finds out from a bad review rather than from us.
//
// One paste-anything field rather than a row of labelled boxes: a
// reseller has these links in a text or an email from the client, and
// making them work out which box each one goes in is friction for no
// gain. The platform is read off the hostname instead.

// Matched on the brand label within the hostname rather than by whole-host
// suffix. Suffix matching looked right and quietly failed every regional
// domain: ubereats.com.au does not end with "ubereats.com", so an
// Australian client's real link came back labelled "Order Online".
//
// `tokens` are matched against the dot-separated parts of the hostname, so
// ubereats.com, ubereats.com.au and www.ubereats.co.uk all resolve. Hosts
// that carry no brand token of their own — DoorDash's order.online, Uber's
// eats.uber.com — are listed explicitly instead.
const PLATFORMS = [
  { label: "DoorDash", tokens: ["doordash"], hosts: ["order.online"] },
  { label: "Uber Eats", tokens: ["ubereats"], hosts: ["eats.uber.com"] },
  { label: "Grubhub", tokens: ["grubhub", "seamless"] },
  { label: "Postmates", tokens: ["postmates"] },
  { label: "Toast", tokens: ["toasttab"], hosts: ["toast.site"] },
  { label: "Slice", tokens: ["slicelife"], hosts: ["slice.tt"] },
  { label: "ChowNow", tokens: ["chownow"] },
  { label: "Clover", tokens: ["clover"] },
  { label: "Square", tokens: ["squareup"], hosts: ["square.site"] },
  { label: "Yelp", tokens: ["yelp"] },
  { label: "OpenTable", tokens: ["opentable"] },
  { label: "Resy", tokens: ["resy"] },
  { label: "Menufy", tokens: ["menufy"] },
  { label: "Beyond Menu", tokens: ["beyondmenu"] },
];

function labelForHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const parts = host.split(".");
  for (const platform of PLATFORMS) {
    if ((platform.tokens || []).some((token) => parts.includes(token))) return platform.label;
    if ((platform.hosts || []).some((h) => host === h || host.endsWith(`.${h}`))) {
      return platform.label;
    }
  }
  return null;
}

/**
 * Turns whatever the reseller pasted into a clean list.
 *
 * Accepts newlines, commas or spaces between links, because people paste
 * from all three. Anything that isn't an http(s) URL is dropped — most
 * importantly `javascript:`, which would otherwise be written straight
 * into an href on a live customer site.
 *
 * Returns [{ url, label }], deduplicated, in the order given.
 */
export function parseOrderLinks(input, { max = 6 } = {}) {
  if (typeof input !== "string" || !input.trim()) return [];

  const pieces = input.split(/[\s,]+/).filter(Boolean);
  const seen = new Set();
  const out = [];

  for (const piece of pieces) {
    // A bare "doordash.com/store/x" is what people paste half the time.
    const candidate = /^https?:\/\//i.test(piece) ? piece : `https://${piece}`;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }

    // Only ever http(s). This is the check that keeps a javascript: or
    // data: URL out of an href on someone's live site.
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    if (!parsed.hostname.includes(".")) continue;

    // Upgrade bare http to https — every one of these platforms serves it,
    // and a mixed-content link on an https site is blocked by the browser.
    if (parsed.protocol === "http:") parsed.protocol = "https:";

    const url = parsed.toString();
    if (seen.has(url)) continue;
    seen.add(url);

    out.push({ url, label: labelForHost(parsed.hostname) || "Order Online" });
    if (out.length >= max) break;
  }

  return out;
}

// The prompt fragment. Written as its own function so the single-page and
// multi-page builders share one wording — the same reason contactBlock is
// pulled out of both prompts.
export function orderLinksBlock(links) {
  if (!links || links.length === 0) {
    // Said explicitly. Restaurants are the business type most likely to
    // have the model reach for a delivery brand on its own, and a made-up
    // DoorDash link is worse than no link at all.
    return `- No online ordering links were provided. Do NOT invent DoorDash, Uber Eats, Grubhub or any other ordering link, and do not link a brand name to a guessed URL. If ordering is worth mentioning at all, point it at the phone number or the contact form instead.`;
  }

  const list = links.map((l) => `  - ${l.label}: ${l.url}`).join("\n");
  return `- Real online ordering links were provided. Build a prominent "Order Online" section near the top of the page (and a matching button in the sticky nav) with one clearly labelled button per link below. Use each URL EXACTLY as given, with target="_blank" rel="noopener". Label each button with the platform name shown. Style them as a row of equal, tappable buttons that wraps on mobile — these are the primary action for a restaurant, so give them at least as much visual weight as the phone number. Do not invent any ordering link that is not in this list.
${list}`;
}
