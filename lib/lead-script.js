// The words to say when the reseller picks up the phone.
//
// Every number in /admin/funnel points at the same wall: people generate
// websites and then stop. 29 finished sites sat unsold while the owner —
// the one person on here who can actually close — sold five. The product
// was never the missing piece. The words were.
//
// Deliberately built from the lead's own facts rather than from a model
// call. Three reasons, in order of how much they cost to learn:
//
//   1. A model call costs money per lead, and a search returns sixty. The
//      night the Anthropic balance ran dry, every generation on the site
//      failed for five hours — a script that needs the same balance would
//      have been dead too, at exactly the moment someone was mid-call.
//   2. It has to be instant. A reseller with the phone already ringing
//      will not wait eight seconds for a paragraph.
//   3. It is testable. A script is a promise about what a stranger will
//      hear; a pure function can be checked, a generated one can only be
//      hoped for.
//
// What the model could add — a genuinely bespoke angle per business — is
// not what a cold caller needs. They need the same four lines every time,
// said sixty times, until the lines are theirs.
//
// One rule runs through all of it: the script never puts a claim in the
// reseller's mouth that they haven't checked. We know from Google whether
// a business has a website. We do NOT know whether that website is any
// good, so the has-a-site script sends them to look at it first and name
// what they actually saw. A caller caught out on an invented detail in
// the first ten seconds has lost the call and the business.

// Filled in by the reseller. One bracket style throughout so a find and
// replace catches every one of them.
const YOU = "[your name]";
const YOUR_NUMBER = "[your number]";
const YOUR_PRICE = "[your price]";
const MONTHLY = "[monthly]";

// "locksmiths in Austin" is what gets typed; "a locksmith" is what gets
// said out loud. Only the last word changes — "hair salons" has to become
// "hair salon", not "hair salon" with the first word mangled too.
export function singular(word) {
  const raw = String(word || "").trim();
  if (!raw) return "";

  const parts = raw.split(/\s+/);
  const last = parts[parts.length - 1];
  const lower = last.toLowerCase();

  let fixed = last;
  if (/[^aeiou]ies$/i.test(lower)) {
    fixed = last.slice(0, -3) + "y"; // bakeries -> bakery
  } else if (/(sses|shes|ches|xes|zes)$/i.test(lower)) {
    fixed = last.slice(0, -2); // car washes -> car wash
  } else if (/ss$|us$|is$|s'$/i.test(lower)) {
    fixed = last; // business, status, chassis — already singular
  } else if (/s$/i.test(lower)) {
    fixed = last.slice(0, -1); // plumbers -> plumber
  }

  parts[parts.length - 1] = fixed;
  return parts.join(" ");
}

function article(word) {
  return /^[aeiou]/i.test(String(word || "").trim()) ? "an" : "a";
}

// Long enough to be specific, short enough that a pasted paragraph can't
// turn the script into a wall of text.
function clean(value, max = 60) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * The script for one lead.
 *
 * @param {object} lead      a row from /api/find-leads
 * @param {object} opts
 * @param {string} opts.category  what the reseller searched for ("locksmiths")
 * @param {string} opts.location  where they searched ("Austin, TX")
 * @param {boolean} opts.built    true once a site already exists for them —
 *                                this changes the offer from a promise into
 *                                a thing that already exists, which is the
 *                                entire advantage of building it first
 * @param {string} opts.link      the share link, when there is one
 */
export function leadScript(lead = {}, opts = {}) {
  const name = clean(lead.name, 80) || "this business";
  const trade = clean(singular(opts.category)) || "local business";
  const trades = clean(opts.category) || "local businesses";
  const city = clean(opts.location, 40);
  const inCity = city ? ` in ${city}` : " around here";
  const hasSite = Boolean(lead.hasWebsite);
  const built = Boolean(opts.built);
  const link = clean(opts.link, 200) || "[the link]";

  // The offer is the same sentence either way: "I already built you a
  // website."
  //
  // It used to soften to "give me three minutes and I'll build you one"
  // when no site existed yet, which is the version that doesn't work.
  // "I could build you one" is a salesman asking for time and gets
  // treated like one. "I already built it" is a thing sitting on the
  // table, and there is nothing to argue with.
  //
  // The honesty lives in the ORDER, not in the wording. Building takes
  // about three minutes, so the line is simply true if you press Build
  // before you dial — which is why that button is the loudest thing in
  // the panel and why the prep step below says so in as many words. Said
  // before building, it is a sentence you can be caught out on the moment
  // they say "great, send it now".
  const offer = `Here's the thing — I've already built it. It's finished, it took me a few minutes, and I'm not asking you to buy anything. I just want you to look at it.`;

  const close = built
    ? `What's the best number to text the link to? It'll be with you before we hang up.`
    : `What's the best number to text the link to?`;

  const prep = hasSite
    ? {
        label: "Before you dial",
        text: `Open their website on your phone — the button is right there in this panel. Find ONE thing that's actually wrong with it: it takes too long to load, the text is too small to read, there's no tap-to-call button, no prices, no photos, or it still says 2019 somewhere. Write that one thing down. That is your opening line, and it has to be true — if you make something up and they open the site while you're talking, the call is over.`,
      }
    : {
        label: "Build it, THEN dial",
        text: `Google shows no website on their listing, which is the easiest version of this call — you're not competing with anything. Press Build below first. It takes about three minutes, and the script says you've already built it, because that's the line that works. Build it and the line is just true — say it before you build and you're stuck the second they answer "great, send it over now".`,
      };

  const hook = hasSite
    ? `I pulled your website up on my phone before I rang, and [the one thing you wrote down]. That's the reason for the call.`
    : `I went looking for ${article(trade)} ${trade}${inCity} on Google Maps and ${name} came up — but there's no website on your listing, so I couldn't see your prices or your hours, and I nearly scrolled straight past you. I figured you'd want to know that's what it looks like from out here.`;

  const call = [
    {
      id: "open",
      label: "Open — 5 seconds, then stop talking",
      text: `Hi, is that the owner? … Hi, my name's ${YOU}. I build websites for ${trades}${inCity}. Have I caught you at a bad time?`,
    },
    { id: "hook", label: "The reason you're calling", text: hook },
    { id: "offer", label: "The offer", text: offer },
    { id: "close", label: "The ask — then say nothing", text: close },
  ];

  const objections = [
    {
      q: `"I'm not interested."`,
      a: `Fair enough, I'll not keep you. Can I send you the link anyway? If it's rubbish you've lost nothing, and if it's good you've got a website. Either way you won't hear from me again unless you call.`,
    },
    {
      q: `"How much is it?"`,
      a: `${YOUR_PRICE} to build it and ${MONTHLY} a month to keep it live and hosted. But I'd honestly rather you saw it before we talk money — let me send the link and you can tell me it's not worth it.`,
    },
    {
      q: `"My nephew / a mate is doing one for me."`,
      a: `No problem at all. When's it going live? … Mine's already done, and it costs you nothing to look. If theirs is better, use theirs — I'd rather you had a good website than mine.`,
    },
    {
      q: `"Send me an email."`,
      a: `Will do — what's the best address? … And so I'm not pestering you, I'll ring back Thursday morning. Does that work?`,
    },
    {
      q: `"I don't need one, all my work is word of mouth."`,
      a: `That's the best kind, and I'd not change it. The website isn't for the people who already know you — it's for the one who asks their mate for ${article(trade)} ${trade}, gets your name, and then Googles you to check you're real. Right now they find nothing and they ring the next ${trade} on the list.`,
    },
    {
      q: `"How did you get my number?"`,
      a: `Off your Google listing — same place your customers get it. That's genuinely all this is.`,
    },
  ];

  // Most cold calls are not answered. The voicemail is the version that
  // actually gets heard, so it says the number twice and gets off.
  const voicemail = `Hi, this is ${YOU}. I build websites for ${trades}${inCity}. I've built one for ${name} already — it's finished, took me a few minutes. Have a look and if you want it, it's yours. Give me a ring on ${YOUR_NUMBER}. That's ${YOUR_NUMBER}. Cheers.`;

  const sms = `Hi — is this ${name}? I'm ${YOU}, I build websites for ${trades}${inCity}. I've built you one already, have a look: ${link} — no charge to look at it, and I'll leave you be if it's not for you.`;

  const email = {
    subject: `${name} — I built you a website`,
    body: `Hi,

I build websites for ${trades}${inCity}. I built one for ${name} — it's finished, and it's here:

${link}

Nothing to sign and no charge to look at it. If you want it, reply and I'll point it at your own domain. If you don't, tell me and I'll take it down.

${YOU}
${YOUR_NUMBER}`,
  };

  const full = [
    `${name} — call script`,
    ``,
    `${prep.label.toUpperCase()}: ${prep.text}`,
    ``,
    ...call.map((s) => `${s.label.toUpperCase()}\n${s.text}\n`),
    `IF THEY SAY…`,
    ...objections.map((o) => `${o.q}\n${o.a}\n`),
    `VOICEMAIL`,
    `${voicemail}`,
    ``,
    `TEXT`,
    `${sms}`,
  ].join("\n");

  return {
    angle: hasSite
      ? "They have a site — you're replacing something, so you need one true observation about it."
      : "No website at all — the easiest call there is. Nothing to argue with.",
    prep,
    call,
    objections,
    voicemail,
    sms,
    email,
    full,
  };
}
