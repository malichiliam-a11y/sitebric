// The cancellation warning, driven in a real browser.
//
// This banner is the only notice a reseller gets before every site they
// have published goes dark. If it renders wrong, or overflows off a phone
// screen, or says nothing at all, the first they hear about it is a
// client ringing to ask why their website is down.
//
//   npm run dev
//   node test/lapsed-ui.mjs

import { chromium } from "playwright";

const OUT = process.env.SHOT_DIR || "";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const problems = [];

for (const [state, w] of [["active", 1100], ["grace", 1100], ["lastday", 1100], ["expired", 1100], ["expired", 390]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 700 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://localhost:3000/dev/lapsed?state=${state}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const label = `${state}@${w}`;
  const hydration = errors.filter((e) => /hydrat|did not match/i.test(e));
  if (hydration.length) problems.push(`${label}: hydration -> ${hydration[0]}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`${label}: scrolls sideways by ${overflow}px`);

  const text = await page.evaluate(() => document.body.innerText);
  // Scoped to the harness root: Next's dev overlay also carries an
  // alert role, and counting it made an empty page look like a warning.
  const hasAlert = await page.locator("#harness").getByRole("alert").count();

  if (state === "active") {
    if (hasAlert) problems.push("active: a paying account is being shown a warning");
  } else {
    if (!hasAlert) problems.push(`${label}: no alert rendered`);
    if (!/Restart my plan/.test(text)) problems.push(`${label}: no way out of it`);
    if (!/Nothing has been deleted|go offline/.test(text))
      problems.push(`${label}: doesn't say what happens`);
  }

  if (state === "lastday" && !/tomorrow/.test(text))
    problems.push("lastday: should say tomorrow rather than a day count");
  if (state === "expired" && !/are offline/.test(text))
    problems.push("expired: should be present tense — it has already happened");

  if (OUT) await page.screenshot({ path: `${OUT}/lapsed-${state}-${w}.png`, fullPage: true });
  console.log(`--- ${label} alert=${hasAlert} overflow=${overflow}`);
  await page.close();
}

await browser.close();
console.log("\n================");
if (problems.length) { problems.forEach((p) => console.log("PROBLEM " + p)); process.exit(1); }
console.log("browser checks passed");
