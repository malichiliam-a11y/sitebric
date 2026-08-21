// The dashboard page frame, driven at three widths.
//
// It exists because the tabs had drifted to wildly different widths —
// Find Leads at 1200px, Billing and Settings pinned at 640 — so most of
// the product was a narrow column with a field of empty black beside it.
// The two things that fix that are the cap going up AND the panels
// flowing into columns, and both are only visible in a browser.
//
//   npm run dev
//   node test/shell-ui.mjs

import { chromium } from "playwright";

const OUT = process.env.SHOT_DIR || "";
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const problems = [];

for (const [name, w, wantCols] of [
  ["wide", 1600, 3],
  ["laptop", 1280, 3],
  ["tablet", 900, 2],
  ["phone", 390, 1],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:3000/dev/shell", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  const hydration = errors.filter((e) => /hydrat|did not match/i.test(e));
  if (hydration.length) problems.push(`${name}: hydration -> ${hydration[0]}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`${name}: scrolls sideways by ${overflow}px`);

  // How many panels share a row — the actual measure of "uses the page".
  // Panels sharing a top edge are on the same row. No width filter: on a
  // phone every panel is full-width, and filtering those out counted zero
  // columns on a layout that was in fact correct.
  const cols = await page.evaluate(() => {
    const counts = {};
    for (const s of document.querySelectorAll("section")) {
      const top = Math.round(s.getBoundingClientRect().top);
      counts[top] = (counts[top] || 0) + 1;
    }
    return Math.max(0, ...Object.values(counts));
  });
  if (cols !== wantCols) problems.push(`${name} (${w}px): ${cols} columns, wanted ${wantCols}`);

  // The content must actually reach across, not sit in a 640px gutter.
  const used = await page.evaluate(() => {
    const s = document.querySelector("section");
    if (!s) return 0;
    const grid = s.parentElement.getBoundingClientRect();
    return Math.round((grid.width / window.innerWidth) * 100);
  });
  if (w <= 1400 && used < 80) problems.push(`${name} (${w}px): content uses only ${used}% of the width`);

  console.log(`--- ${name} ${w}px  columns=${cols}  width used=${used}%  overflow=${overflow}`);
  if (OUT) await page.screenshot({ path: `${OUT}/shell-${name}.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log("\n================");
if (problems.length) { problems.forEach((p) => console.log("PROBLEM " + p)); process.exit(1); }
console.log("browser checks passed");
