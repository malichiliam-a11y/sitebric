// The connected-domain panel, driven in a real browser in every state.
//
// Needs the dev server up:
//
//   npm run dev                # in one shell
//   node test/domain-ui.mjs
//
// The check that matters is the last one: the word "connected" on its own
// used to be the whole status, so a domain pointing at nothing read as
// finished. Every non-live state here must say, on screen, that it is not
// ready yet — and only the live one may claim it is.

import { chromium } from "playwright";

const OUT = process.env.SHOT_DIR || "";
const problems = [];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

const CASES = [
  ["live", /Live\. Anyone typing this domain sees the site\./, /\bLIVE\b/],
  ["waiting", /Not pointing here yet/, /WAITING ON DNS/],
  ["propagating", /Nameservers are pointing here/, /WAITING ON DNS/],
  ["verify", /already attached to another account/, /NEEDS A RECORD/],
  ["unknown", /Couldn't check this domain/, /CHECKING/],
];

for (const [state, body, badge] of CASES) {
  for (const [label, w] of [["", 940], ["-mobile", 390]]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(`http://localhost:3000/dev/domain?state=${state}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(400);
    if (OUT && !label) await page.screenshot({ path: `${OUT}/domain-${state}.png`, fullPage: true });

    const hydration = errors.filter((e) => /hydrat|did not match/i.test(e));
    if (hydration.length) problems.push(`${state}${label}: hydration -> ${hydration[0]}`);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 1) problems.push(`${state}${label}: scrolls sideways by ${overflow}px`);

    const text = await page.evaluate(() => document.body.innerText);
    if (!body.test(text)) problems.push(`${state}${label}: missing message ${body}`);
    if (!badge.test(text)) problems.push(`${state}${label}: missing badge ${badge}`);

    // The whole point. Anything not live must not read as done, and the
    // live one must not still be showing setup steps.
    if (state === "live") {
      if (/One more step/.test(text)) problems.push("live: still showing setup steps");
      if (/nameservers/i.test(text)) problems.push("live: still reciting the nameservers");
    } else {
      if (!/One more step/.test(text)) problems.push(`${state}${label}: doesn't say work remains`);
      if (/Done —/.test(text)) problems.push(`${state}${label}: claims it is done`);
    }

    // A reseller stuck waiting needs something to hand over today.
    if (state === "waiting" && !/yudawireless\.sitebric\.com/.test(text))
      problems.push("waiting: no working address offered in the meantime");

    // The registrar's own nameservers, read back so they can see the
    // mismatch rather than being told to check.
    if (state === "waiting" && !/dns1\.registrar-servers\.com/.test(text))
      problems.push("waiting: doesn't name the nameservers currently in use");

    // Already done it — don't tell them to do it again.
    if (state === "propagating" && /Custom DNS/.test(text))
      problems.push("propagating: still telling them to change the nameservers");

    if (!label) console.log(`--- ${state}: overflow=${overflow}`);
    await page.close();
  }
}

// Copy hands up the right value.
//
// The harness records what the panel passes to onCopy rather than reading
// the clipboard back: a headless browser accepts writeText and then
// returns "" from readText, which fails a button that works. Writing to
// the clipboard is the dashboard's half of this; handing up the correct
// string is the panel's, and that is what is asserted here.
{
  const page = await browser.newPage({ viewport: { width: 940, height: 900 } });
  await page.goto("http://localhost:3000/dev/domain?state=waiting", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Copy" }).first().click();
  await page.waitForTimeout(200);

  const copied = await page.evaluate(() => window.__copied || []);
  if (copied[0] !== "ns1.vercel-dns.com")
    problems.push(`copy: panel handed up ${JSON.stringify(copied)}`);
  const text = await page.evaluate(() => document.body.innerText);
  if (!/Copied/.test(text)) problems.push("copy: no confirmation shown");
  await page.close();
}

await browser.close();
console.log("\n================");
if (problems.length) {
  problems.forEach((p) => console.log("PROBLEM " + p));
  process.exit(1);
}
console.log("browser checks passed");
