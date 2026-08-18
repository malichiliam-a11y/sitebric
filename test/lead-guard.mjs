// Proves the lead guard captures an enquiry from a form whose own handler
// fakes success — the failure found on three generated sites, one of them
// published and live. Driven in a real browser, because the whole bug was
// a question of event ordering that reads fine on the page.

// Run with:  npm i --no-save playwright && node test/lead-guard.mjs
import { chromium } from "playwright";
import assert from "node:assert";
import { makeButtonsWork, stripLeadFormGuard } from "../lib/fix-buttons.js";

const PROJECT_ID = "11111111-2222-3333-4444-555555555555";

// Copied in shape from the published "Power wash" site: an inline
// onsubmit that preventDefaults, relabels the button, and resets the form
// without sending anything anywhere.
const FAKE_SUCCESS = `<!DOCTYPE html><html><body>
<section id="contact">
  <form class="cta-form" onsubmit="handleForm(event)">
    <input class="cta-input" type="text" placeholder="Your Name" required>
    <input class="cta-input" type="tel" placeholder="Phone Number" required>
    <button type="submit">Request My Free Quote</button>
  </form>
</section>
<a href="#">Book Now</a>
<script>
function handleForm(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = "✓ We'll Call You Shortly!";
  btn.disabled = true;
  e.target.reset();
}
</script>
</body></html>`;

// A page that posts to the endpoint itself. The guard must stay out of
// its way entirely or every enquiry arrives twice.
const PAGE_POSTS = `<!DOCTYPE html><html><body>
<section id="contact">
  <form id="f">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button type="submit">Send</button>
  </form>
</section>
<script>
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  fetch('https://sitebric.com/api/site-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 'own', name: 'own-code' })
  });
});
</script>
</body></html>`;

// A form with no handler at all — the plain case.
const BARE = `<!DOCTYPE html><html><body>
<section id="contact">
  <form>
    <input type="text" name="name" required>
    <input type="email" name="email" required>
    <textarea name="message"></textarea>
    <button type="submit">Send</button>
  </form>
</section>
</body></html>`;

async function run(browser, html, fill) {
  const { code } = makeButtonsWork(html, PROJECT_ID);
  const page = await browser.newPage();
  const posts = [];

  await page.route("https://sitebric.com/api/site-lead", async (route) => {
    posts.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.setContent(code, { waitUntil: "domcontentloaded" });
  await fill(page);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);

  const buttonText = await page.textContent('button[type="submit"]').catch(() => null);
  await page.close();
  return { posts, buttonText, code };
}

// The bundled Chromium is pinned by the environment, not by a lockfile
// here — playwright is deliberately not a dependency of this project, so
// that a Vercel build never tries to download a browser.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

// 1. The failure this was written for.
{
  const { posts, buttonText } = await run(browser, FAKE_SUCCESS, async (page) => {
    await page.fill('input[type="text"]', "Marcus Bell");
    await page.fill('input[type="tel"]', "555-0142");
  });

  check("a form that fakes success still sends the lead", () => {
    assert.strictEqual(posts.length, 1, `expected 1 post, got ${posts.length}`);
  });
  check("the values survive the page's own form.reset()", () => {
    assert.strictEqual(posts[0]?.name, "Marcus Bell");
    assert.strictEqual(posts[0]?.contact, "555-0142");
  });
  check("the lead is filed against the right project", () => {
    assert.strictEqual(posts[0]?.projectId, PROJECT_ID);
  });
  check("the page keeps the success message it wrote", () => {
    assert.match(buttonText || "", /Call You Shortly/);
  });
}

// 2. No double-posting when the page already handles it.
{
  const { posts } = await run(browser, PAGE_POSTS, async (page) => {
    await page.fill('input[name="name"]', "Ada");
    await page.fill('input[name="phone"]', "555-0199");
  });

  check("a page that posts its own leads is not doubled up", () => {
    assert.strictEqual(posts.length, 1, `expected 1 post, got ${posts.length}`);
    assert.strictEqual(posts[0]?.name, "own-code");
  });
}

// 3. The plain case still works.
{
  const { posts } = await run(browser, BARE, async (page) => {
    await page.fill('input[name="name"]', "Rosa Lin");
    await page.fill('input[name="email"]', "rosa@example.com");
    await page.fill("textarea", "Need a quote for a driveway.");
  });

  check("an unwired form is captured", () => {
    assert.strictEqual(posts.length, 1);
    assert.strictEqual(posts[0]?.name, "Rosa Lin");
    assert.strictEqual(posts[0]?.contact, "rosa@example.com");
    assert.match(posts[0]?.message || "", /driveway/);
  });
}

// 4. Idempotence — running the repair repeatedly must not stack guards.
{
  const once = makeButtonsWork(FAKE_SUCCESS, PROJECT_ID).code;
  const twice = makeButtonsWork(once, PROJECT_ID).code;
  const thrice = makeButtonsWork(twice, PROJECT_ID).code;

  check("re-running the guard is a no-op", () => {
    assert.strictEqual(twice, once);
    assert.strictEqual(thrice, once);
  });
  check("exactly one guard is present", () => {
    const count = (twice.match(/sitebric-lead-guard-->/g) || []).length;
    assert.strictEqual(count, 2, `expected one open + one close marker, got ${count}`);
  });
  check("stripping leaves the page's own code intact", () => {
    assert.ok(!stripLeadFormGuard(twice).includes("sitebricSent"));
    assert.match(stripLeadFormGuard(twice), /Call You Shortly/);
  });
  check("dead links were pointed at the contact section", () => {
    assert.match(once, /<a href="#contact">Book Now<\/a>/);
  });
}

// 5. A guard written by the previous version is replaced, not stacked.
{
  const legacy = `<!DOCTYPE html><html><body>
<section id="contact"><form><input name="name"></form></section>
<script>
(function () {
  var ENDPOINT = 'https://sitebric.com/api/site-lead';
  var PROJECT_ID = "old";
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented || e.target.dataset.sitebricSent) return;
  });
})();
</script>
</body></html>`;

  const upgraded = makeButtonsWork(legacy, PROJECT_ID).code;
  check("the old guard is removed", () => {
    assert.ok(!upgraded.includes('var PROJECT_ID = "old"'));
  });
  check("only the new guard remains", () => {
    const count = (upgraded.match(/var ENDPOINT = 'https:\/\/sitebric\.com\/api\/site-lead'/g) || [])
      .length;
    assert.strictEqual(count, 1, `expected 1 endpoint reference, got ${count}`);
  });
}

await browser.close();

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
