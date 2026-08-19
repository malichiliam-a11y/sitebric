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

  // The offer sentence carries the whole pitch, and it is a different
  // sentence depending on whether the site exists yet. "I could build you
  // one" is a salesman asking for time. "I already built you one" is a
  // gift sitting on the table — and it takes about three minutes to make
  // true, which is why the panel tells them to build it first.
  const offer = built
    ? `Here's the thing — I already built it. It's finished, it's live, and it took me about three minutes. I'm not asking you to buy anything, I just want you to look at it.`
    : `Give me three minutes after this call and I'll build you one, free, so you can see it before you decide anything. If you hate it, you tell me and that's the end of it.`;

  const close = built
    ? `What's the best number to text the link to? It'll be with you before we hang up.`
    : `What's the best number to send it to? You'll have it within the hour.`;

  const prep = hasSite
    ? {
        label: "Before you dial",
        text: `Open their website on your phone — the button is right there in this panel. Find ONE thing that's actually wrong with it: it takes too long to load, the text is too small to read, there's no tap-to-call button, no prices, no photos, or it still says 2019 somewhere. Write that one thing down. That is your opening line, and it has to be true — if you make something up and they open the site while you're talking, the call is over.`,
      }
    : {
        label: "Before you dial",
        text: `Google shows no website on their listing, which is the easiest version of this call — you are not competing with anything. Build the site first (the button is in this panel). Walking in with a finished website beats describing one every single time.`,
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
  const voicemail = built
    ? `Hi, this is ${YOU}. I build websites for ${trades}${inCity}. I've built one for ${name} already — it's finished and it's live, took me a few minutes. Have a look and if you want it, it's yours. Give me a ring on ${YOUR_NUMBER}. That's ${YOUR_NUMBER}. Cheers.`
    : `Hi, this is ${YOU}. I build websites for ${trades}${inCity}. I noticed ${name} hasn't got one on your Google listing and I'd like to build you one to look at — free, no catch. Ring me on ${YOUR_NUMBER}. That's ${YOUR_NUMBER}. Cheers.`;

  const sms = built
    ? `Hi — is this ${name}? I'm ${YOU}, I build websites for ${trades}${inCity}. I've built you one already, have a look: ${link} — no charge to look at it, and I'll leave you be if it's not for you.`
    : `Hi — is this ${name}? I'm ${YOU}, I build websites for ${trades}${inCity}. Noticed there's no website on your Google listing. Want me to build you one to look at? Free, takes me a few minutes.`;

  const email = {
    subject: built ? `${name} — I built you a website` : `${name} — a website, free to look at`,
    body: built
      ? `Hi,

I build websites for ${trades}${inCity}. I built one for ${name} this morning — it's finished and live here:

${link}

Nothing to sign and no charge to look at it. If you want it, reply and I'll point it at your own domain. If you don't, tell me and I'll take it down.

${YOU}
${YOUR_NUMBER}`
      : `Hi,

I build websites for ${trades}${inCity}. ${
          hasSite
            ? `I had a look at your current site on my phone and think it could be doing a lot more for you.`
            : `I couldn't find a website for ${name} on your Google listing.`
        }

Give me the nod and I'll build you one today so you can see it — free, nothing to sign. If it's not right, you tell me and that's the end of it.

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
