// The receptionist tab, driven in a real browser in every plan state.
//
// Needs the dev server up, because the screen is a React component rather
// than a page of HTML the way test/lead-guard.mjs's fixtures are:
//
//   npm run dev                  # in one shell
//   node test/receptionist-ui.mjs
//
// Checks, in order: no hydration mismatch (this repo has shipped that
// three times, and it silently throws away the whole server render), no
// sideways scroll at 390px, no serif fallback from an undefined CSS
// variable, the line selector actually switches lines — including the
// uncontrolled config boxes, which is where a real bug was caught — and
// that the plan's line cap is both stated and enforced in the UI.

import { chromium } from "playwright";

const OUT = process.env.SHOT_DIR || "";
const shots = [
  ["trial", 940, 1400],
  ["empty", 940, 1500],
  ["two", 940, 1700],
  ["full", 940, 1700],
  ["two-mobile", 390, 1700],
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const problems = [];

for (const [name, w, h] of shots) {
  const state = name.replace("-mobile", "");
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:3000/dev/receptionist?state=${state}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (OUT) await page.screenshot({ path: `${OUT}/rx-${name}.png`, fullPage: true });

  const hydration = errors.filter((e) => /hydrat|did not match|Text content does not match/i.test(e));
  if (hydration.length) problems.push(`${name}: hydration -> ${hydration[0]}`);

  // Horizontal overflow: the page body must never scroll sideways.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${name}: body scrolls horizontally by ${overflow}px`);

  // The headline must not fall back to a serif — an undefined CSS var
  // makes the whole font-family declaration invalid and it gets dropped.
  const fam = await page.evaluate(() => {
    const h = document.querySelector("div");
    return h ? getComputedStyle(h).fontFamily : "";
  });
  if (/(?<!sans-)serif|times|georgia/i.test(fam)) problems.push(`${name}: serif fallback -> ${fam}`);

  const text = await page.evaluate(() => document.body.innerText);
  console.log(`\n--- ${name} (${w}px) errors=${errors.length} overflow=${overflow}`);
  console.log(text.split("\n").filter(Boolean).slice(0, 40).join("\n"));
  await page.close();
}

// Drive the line selector for real.
{
  const page = await browser.newPage({ viewport: { width: 940, height: 1700 } });
  await page.goto("http://localhost:3000/dev/receptionist?state=two", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Riverside Plumbing/ }).click();
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => document.body.innerText);
  if (!/Answering for Riverside Plumbing/.test(shown))
    problems.push("selector: clicking the second line did not switch the detail panel");
  // The config boxes are uncontrolled, so switching lines has to remount
  // them — otherwise the first client's mobile stays in the box.
  const forward = await page.locator('input[placeholder="+1 512 555 9999"]').inputValue();
  if (forward !== "+15125552222")
    problems.push(`selector: forward-to box kept a stale value -> ${forward}`);
  const facts = await page.locator("textarea").inputValue();
  if (!/Emergency call-outs/.test(facts))
    problems.push(`selector: facts box kept a stale value -> ${facts}`);
  if (OUT) await page.screenshot({ path: `${OUT}/rx-selected-second.png`, fullPage: true });

  await page.getByRole("button", { name: "+ Add a line" }).click();
  await page.waitForTimeout(300);
  const adding = await page.evaluate(() => document.body.innerText);
  if (!/Add another line/.test(adding)) problems.push("add: the buy panel did not open");
  if (/Answering for/.test(adding)) problems.push("add: the detail panel stayed open behind the buy panel");
  if (OUT) await page.screenshot({ path: `${OUT}/rx-adding.png`, fullPage: true });

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(300);
  const cancelled = await page.evaluate(() => document.body.innerText);
  if (!/Answering for Riverside Plumbing/.test(cancelled))
    problems.push("cancel: did not return to the selected line");
  await page.close();
}

// At the cap there must be no way to add one.
{
  const page = await browser.newPage({ viewport: { width: 940, height: 1700 } });
  await page.goto("http://localhost:3000/dev/receptionist?state=full", { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: "+ Add a line" }).count())
    problems.push("full: Add a line is offered at the cap");
  const t = await page.evaluate(() => document.body.innerText);
  if (!/3 of 3 on Starter — upgrade for more/.test(t))
    problems.push(`full: allowance line wrong -> ${t.match(/\d+ of \d+[^\n]*/)?.[0]}`);
  await page.close();
}

await browser.close();
console.log("\n================");
if (problems.length) { problems.forEach((p) => console.log("PROBLEM " + p)); process.exit(1); }
console.log("browser checks passed");
