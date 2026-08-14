// Last line of defence for generated sites.
//
// The generation prompt already tells the model never to invent a phone
// number, and it mostly complies — but "mostly" isn't a standard you can
// hand a paying client. Four sites shipped with a Call Now button wired to
// 555-123-4567, one of them published to a real business. A prompt is a
// request; this is the guarantee.

// 555 is reserved and unassignable, so a number carrying it is by
// definition not real. It has to be checked in BOTH positions: the classic
// invented number (555) 123-4567 puts it in the area code, while a
// plausible-looking (718) 555-0100 puts it in the exchange. Testing the
// position rather than a list of known numbers catches newly-invented ones.
function isFakeNumber(raw) {
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return false;
  return local.slice(0, 3) === "555" || local.slice(3, 6) === "555";
}

// Anything phone-shaped: 555-1234, (555) 123-4567, 718.555.0100, +1 555 …
// The country-code group requires the 1 to actually be there — an optional
// separator on its own would swallow the space in front of the number and
// silently close up the surrounding sentence.
const PHONE_SHAPED = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

/**
 * Rewrites any "Call Now" link pointing at a fabricated number.
 *
 * With a real phone on the project the fake is swapped for it. Without one
 * the link becomes an anchor to the contact section — which is exactly what
 * the prompt asks for in that case — and the iframe postMessage shim is
 * dropped along with it, since it exists only to carry tel: navigation out
 * of a sandboxed preview.
 *
 * Deliberately limited to href="tel:" values. Visible text is only touched
 * when there's a real number to put in its place, so a form's
 * placeholder="(718) 555-0100 or jane@email.com" — legitimate example text,
 * not a claim about the business — is never rewritten.
 *
 * @returns {{ code: string, changed: number }}
 */
export function stripFakePhoneNumbers(code, realPhone) {
  if (typeof code !== "string" || !code) return { code, changed: 0 };

  const realDigits = realPhone ? String(realPhone).replace(/[^\d+]/g, "") : "";
  const hasReal = Boolean(realDigits) && !isFakeNumber(realDigits);
  let changed = 0;

  // Whole opening tag, so the onclick shim can be dropped with the href.
  let out = code.replace(/<a\s[^>]*href="tel:([^"]*)"[^>]*>/gi, (tag, telValue) => {
    if (!isFakeNumber(telValue)) return tag;
    changed++;

    if (hasReal) return tag.replace(/href="tel:[^"]*"/i, `href="tel:${realDigits}"`);

    return tag
      .replace(/href="tel:[^"]*"/i, 'href="#contact"')
      .replace(/\sonclick="[^"]*"/i, "");
  });

  // Only safe in the has-a-real-number case: substitution, never deletion.
  // Matching >…< means this only ever sees text between tags, so attribute
  // values — placeholder, aria-label, alt — are structurally out of reach.
  if (hasReal) {
    out = out.replace(/>([^<]*)</g, (chunk, text) => {
      if (!text.trim()) return chunk;
      const fixed = text.replace(PHONE_SHAPED, (m) => (isFakeNumber(m) ? realPhone : m));
      if (fixed === text) return chunk;
      changed++;
      return ">" + fixed + "<";
    });
  }

  return { code: out, changed };
}
