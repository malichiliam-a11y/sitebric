// Copy for the /for/<audience> landing pages.
//
// One product, three different reasons to buy it. The generic homepage has
// to speak to everyone at once; these don't, so each one leads with the
// specific thing that audience is stuck on and never mentions the others.
//
// Icons are named rather than imported so this file stays free of client
// components — the route's server component reads it for metadata, and
// AudienceLanding maps the names to real icons.

export type IconName = "bolt" | "pencil" | "rocket" | "star";

export type Audience = {
  slug: string;
  /** Browser tab + search result title. */
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** Bright first half of the headline. */
  headlineHead: string;
  /** Faint tail — carries the turn in the sentence. */
  headlineTail: string;
  subhead: string;
  /** First person, for the "Which one are you?" chooser on the homepage. */
  chooserLabel: string;
  chooserBlurb: string;
  features: { icon: IconName; title: string; desc: string }[];
  /** The pricing hook, in this audience's terms. */
  moneyLine: string;
  faqs: { q: string; a: string }[];
};

// Claims here are about our own price and product only. There is no review
// or customer-count data behind this product yet, so nothing on these pages
// may imply any — the homepage had placeholder avatars and a star rating
// removed for exactly this reason.
const SHARED_FAQS = [
  {
    q: "Do I own the sites I generate?",
    a: "Yes — every site you generate is yours to hand off, host, or charge for however you like.",
  },
  {
    q: "Do my clients need a Sitebric account?",
    a: "No. Your clients never see Sitebric. You work from your dashboard and hand them the finished site.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, no contracts — cancel whenever, no questions asked.",
  },
];

export const AUDIENCES: Audience[] = [
  {
    slug: "agencies",
    metaTitle: "Sitebric for agencies — make small web jobs profitable again",
    metaDescription:
      "A $900 brochure site isn't worth a designer-week. Generate finished client sites in minutes and say yes to the jobs you used to turn down.",
    eyebrow: "FOR AGENCIES",
    headlineHead: "Say yes to the small jobs",
    headlineTail: "you keep turning down.",
    subhead:
      "A $900 brochure site isn't worth a week of a designer's time, so it gets declined or padded into something the client won't buy. Describe the business, get a finished site, and put those jobs back on the board.",
    chooserLabel: "I run an agency",
    chooserBlurb: "Add websites to what you already sell, without adding headcount.",
    features: [
      {
        icon: "bolt",
        title: "Same-day turnaround",
        desc: "Brief in, finished site out. Book it in the morning and deliver it before the day's over.",
      },
      {
        icon: "rocket",
        title: "Every client in one place",
        desc: "Sites, leads and invoices per client, in one dashboard instead of scattered across drives and threads.",
      },
      {
        icon: "pencil",
        title: "Not a template with the logo swapped",
        desc: "Each site is generated for that specific business — real copy, real structure. Edit anything before it ships.",
      },
    ],
    moneyLine:
      "Your minimum was $2,500 because anything under it lost money on hours. That math just changed.",
    faqs: [
      {
        q: "Can my whole team work out of one account?",
        a: "Yes — every site you generate lives in the same dashboard, so the work isn't stranded on one person's machine.",
      },
      {
        q: "Can I put client sites on their own domain?",
        a: "Yes — Growth and Pro plans let you connect any domain you or your client owns.",
      },
      ...SHARED_FAQS,
    ],
  },
  {
    slug: "freelancers",
    metaTitle: "Sitebric for freelancers — stop trading a week per website",
    metaDescription:
      "Your income is capped by how many weeks are in a year. Generate the build in minutes and spend your time on the parts clients actually pay for.",
    eyebrow: "FOR FREELANCERS",
    headlineHead: "Stop trading a week",
    headlineTail: "for every website.",
    subhead:
      "There are only so many weeks in a year, and right now that number is your income ceiling. Let the build take minutes instead, and spend your hours on the work clients are actually paying you for.",
    chooserLabel: "I freelance",
    chooserBlurb: "Take on more clients without giving up more weeks.",
    features: [
      {
        icon: "bolt",
        title: "The build stops being the job",
        desc: "Describe the business, get the site. What used to eat four days now happens while you read the brief back.",
      },
      {
        icon: "pencil",
        title: "Still yours to shape",
        desc: "Nothing ships without you. Edit copy, layout and structure before handing it over — it's a finished starting point, not a locked template.",
      },
      {
        icon: "rocket",
        title: "Run three clients at once",
        desc: "Every project in one dashboard, so taking on more work stops meaning more places to lose track of it.",
      },
    ],
    moneyLine:
      "A single client site covers a whole year of Sitebric several times over.",
    faqs: [
      {
        q: "Can I edit what gets generated?",
        a: "Yes — you can rewrite copy and adjust the site before you hand it off. Generation gives you a finished draft, not a final answer.",
      },
      {
        q: "What if a client wants something specific?",
        a: "Say so in the brief. An explicit instruction always beats the default house style, so you can steer the result rather than fight it.",
      },
      ...SHARED_FAQS,
    ],
  },
  {
    slug: "side-hustle",
    metaTitle: "Sitebric for beginners — sell websites without building them",
    metaDescription:
      "Local businesses need websites and don't care how they're made. No code, no design skills — describe the business, hand over something real.",
    eyebrow: "FOR STARTING OUT",
    headlineHead: "Sell websites before",
    headlineTail: "you can build one.",
    subhead:
      "The businesses down your street need a website and genuinely don't care how it got made. Describe one, hand over something real, and keep the difference.",
    chooserLabel: "I'm just starting out",
    chooserBlurb: "No code, no portfolio, no experience needed.",
    features: [
      {
        icon: "bolt",
        title: "No code, no design skills",
        desc: "Write a couple of sentences about the business. That is the entire skill requirement.",
      },
      {
        icon: "star",
        title: "Something to show on day one",
        desc: "Generate a sample site for a shop before you ever speak to them, and walk in with the work already done.",
      },
      {
        icon: "rocket",
        title: "Get paid from the dashboard",
        desc: "Type the amount and their email and Sitebric sends a real invoice, so you don't need to figure out billing first.",
      },
    ],
    moneyLine: "Sites like these sell for $500–$2,000. Sitebric starts at $15 a month.",
    faqs: [
      {
        q: "Do I need to know how to code?",
        a: "No. If you can describe a business in a sentence, that's the whole skill. There's nothing to install and nothing to configure.",
      },
      {
        q: "How do I get paid?",
        a: "However you like — and there's an invoice tool built in. Enter the amount and your client's email and Sitebric emails them an itemised invoice.",
      },
      ...SHARED_FAQS,
    ],
  },
];

export function getAudience(slug: string): Audience | undefined {
  return AUDIENCES.find((a) => a.slug === slug);
}
