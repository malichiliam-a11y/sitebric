# Sitebric — working notes

Next.js 14 (App Router) + Supabase + Stripe + Anthropic API. Resellers describe a
client business and get a finished website they can hand off.

## Layout

| Path | What it is |
|---|---|
| `app/page.tsx`, `app/login/` | Both render `app/components/login/LoginScreen.tsx` — one shared composition, so the two routes can never drift apart again |
| `app/components/login/` | Login hero, animated terrain backdrop, marketing sections |
| `app/dashboard/dashboard-client.js` | The whole workspace (~2100 lines): sites, leads, billing, profile, settings |
| `app/api/generate/route.js` | Site generation — the core product action |
| `lib/design.ts` | Login-screen tokens |
| `lib/theme.js` | Dashboard tokens |
| `lib/plans.js` | Plan limits and Stripe price IDs — the single source of truth |
| `lib/logo.js` | Swaps a site's text wordmark for an uploaded logo — a pure transform, no model call |
| `lib/receptionist.js` | What the AI receptionist says on a call — pure, no Twilio |
| `lib/twilio-signature.js` | Proves a /api/voice/* request is really Twilio's. The most important check in the product |
| `lib/twiml.js` | The XML Twilio reads back. Every string goes through `esc()` |
| `app/api/voice/` | incoming / turn / status — the call itself |
| `lib/site-styles.js` | The seven looks a site can be built in — the allowlist the prompt fragment is read from |
| `lib/lead-script.js` | The words to say on a cold call, built from a lead's own facts — pure, no model call |
| `lib/leads-csv.js` | The saved-leads download, with the Excel formula-injection guard |
| `app/dashboard/LeadCards.js`, `LeadDetail.js` | The leads UI, split out so it can be driven in a browser without a login |
| `app/dev/receptionist/` | The receptionist screen in every plan state, with no login. 404 in production. `node test/receptionist-ui.mjs` drives it |

## Traps that have bitten this codebase

**`<style>` blocks must use `dangerouslySetInnerHTML`.** React escapes `<`, `>`,
`'` and `"` in the text child of a `<style>` tag, so server and client markup
disagree and React throws away the server render — the whole page silently falls
back to client rendering. This shipped three separate times (login, dashboard,
pricing) and is invisible without checking the console. Never write
``<style>{`...`}</style>``.

**Anthropic calls above ~16k `max_tokens` must stream.** A buffered request that
large runs long enough to hit HTTP timeouts; the connection dies mid-generation
and the browser reports a bare "Load failed" with no server error to show.
`app/api/generate/route.js` streams for this reason — don't convert it back.

**Percentage heights don't resolve through flex chains on replaced elements.**
The site preview `<iframe>` collapsed to ~150px on mobile until it was given
`position: absolute; inset: 0`.

**Supabase silently rewrites `redirect_to`** to the bare Site URL when the
requested URL isn't in the project's allowed Redirect URLs. That dumped
password-reset links on the login page instead of the reset form. `AuthCard`
forwards recovery landings to `/reset-password`; adding `https://sitebric.com/**`
to the allow-list fixes it at the source.

**A generated form that fakes success is worse than no form.** Several sites
shipped a submit handler that called `preventDefault`, hid the form and showed
"we'll call you shortly" — and posted nowhere. The lead guard in
`lib/fix-buttons.js` used to treat `defaultPrevented` as "the page has this in
hand" and stand down, so those forms stayed silently broken on live sites. The
guard now decides at build time, by reading the page's own code for a post to
`/api/site-lead`, and listens in the capture phase when it finds none — early
enough to read the fields before the page's handler calls `form.reset()`.
`node test/lead-guard.mjs` drives all of this in a real browser.

**An uncontrolled input keeps the previous row's value.** The receptionist
config boxes use `defaultValue`, which React applies once, on mount. Adding
a line selector meant switching between clients re-rendered the same
`<input>` in the same position, so React reused the DOM node and left the
first client's emergency mobile number sitting in the box — one press of
Save from being written to the second client's line. Fixed by keying the
panel on the line's id so it remounts. The fixtures had identical data for
every line, so the first browser check passed over it; `test/receptionist-ui.mjs`
now gives each line distinct values and asserts the boxes change.

**A clickable card must not be `role="button"`.** The lead cards carry
their own buttons (Save, Open), and an ARIA button may not contain other
controls — the card's accessible name is computed from everything inside
it, so the whole card announced as one button called "Northgate Locksmiths
NO WEBSITE 112 Northgate St … Save", and Playwright aiming at the Save
button hit the card instead. Clickable wrapper: plain `div` with `onClick`,
plus a real `<button>` inside for keyboard and screen readers.

**Referral capture must survive the whole signup path.** `?ref=` is stored in
localStorage and only read in `app/api/ensure-profile/route.js`, the single point
every profile is created through, and only on first creation. Anything that
changes routing on `/` must leave `?ref=` alone.

## The receptionist

A Twilio number answers, takes the caller's name, number and what they
need, and puts real emergencies through to a mobile.

**On every paid plan; the plan caps how many lines, not whether you get
one.** Starter 3, Growth 10, Pro 25 — `numbersAllowed` in `lib/plans.js`
is the single source, used by `/api/receptionist` and the dashboard, and
`test/promises.mjs` ties the pricing card to it. It was Growth-and-Pro-only,
which was backwards: a reseller can't sell a thing they've never heard.
The free trial gets **zero** lines and the public demo number instead —
every line is a monthly Twilio charge whether it rings or not, so renting
one for an account that has paid nothing is the one part of this that
quietly loses money.

Things that will bite:

- **`/api/voice/*` are public URLs that spend money.** Every one validates
  the Twilio signature first and returns 403 otherwise, including when no
  auth token is configured. `lib/twilio-signature.js` was checked against
  Twilio's own library across 3000 randomised inputs — a remembered test
  vector was tried first and was wrong.
- **The signed URL comes from `PUBLIC_BASE_URL`, never from the request.**
  Behind Vercel's proxy the request reports an internal host, so every
  signature fails; a forwarded-host header is attacker-controlled.
- **Twilio gives a webhook ~15 seconds.** The model call runs under an 8s
  abort and falls back to a real sentence. Dead air then a disconnection
  is the one failure a caller can't forgive.
- **Caller speech goes into XML.** "me & my wife" breaks the document and
  drops the call. Everything goes through `esc()` in `lib/twiml.js`.
- **The status callback can fire twice.** Minutes are only billed when
  `seconds` is still 0, or a customer's allowance pays for calls that
  never happened.
- The assistant may only state facts from `business_facts`. It is on a
  recorded line speaking for someone else's business.
- **One number is public.** The row with `is_demo` is shown to every user
  on every plan, including accounts that can't use the feature — hearing
  it is what sells it. It is therefore the only number a stranger can
  dial, so it carries its own caps: `DEMO_CALLS_PER_DAY` per calling
  number and a lower turn ceiling. Only the owner can nominate one.

## Auth flow

Email signup mails a **6-digit code**, not a link. `AuthCard` collects it via
`verifyOtp`. Two cases that look like bugs and aren't:

- Signing up with an address that already exists returns a session-less user with
  an empty `identities` array and **sends no mail at all** — Supabase won't
  confirm or deny the account exists. Handled by routing back to login.
- A login failing with `email_not_confirmed` re-sends a code and goes to the
  verify screen, so accounts created before this flow existed aren't stranded.

## Open items

- Add `https://sitebric.com/**` to Supabase → Authentication → URL Configuration.
  Code works around its absence; this fixes the cause.
- Password reset has been walked end-to-end by a human (2026-08-07) — confirmed
  working.
- `/admin/referrals` estimates MRR from list price, so a discounted subscriber
  (APEX is on a $5-off coupon for 6 months) reads $5/mo high.
- **The per-number add-on is still unbuilt.** At 25 lines a Pro subscriber
  costs roughly $29/month in Twilio rent against $69.99 of revenue. Still
  profit, but that tier is where a per-line charge stops being optional.
  Nobody is near the cap yet, so this is a watch item, not a fire.
- Dashboard UI still can't be driven end-to-end here — there's no way to sign
  in from the sandbox. The leads and receptionist components are verifiable
  because they were split into their own files; the rest of
  `dashboard-client.js` is not. `app/dev/receptionist/` is the pattern worth
  copying for the next screen that needs it: a fixture page that 404s in
  production, plus a Playwright driver in `test/`.

## Promises the code has to keep

`test/promises.mjs` reads the marketing copy and the routes and fails if
they disagree. Two had already drifted silently:

- The pricing page says **editing is unlimited and free**. `/api/edit` was
  charging a generation and refusing once the allowance ran out, so a
  Starter customer with five sites couldn't fix a typo on any of them.
  Edits are free now. If edit volume ever becomes a real API cost, cap it
  per hour — don't reintroduce a charge the price list denies.
- The FAQ says **custom domains are Growth and Pro**. `/api/connect-domain`
  checked only project ownership, so a trial account could attach a
  hostname to the Vercel project. `canUseCustomDomain` in `lib/plans.js` is
  now the single source, used by the route and the dashboard.

Any new sentence on a pricing or FAQ page that a route has to honour
belongs in that test.

## Working agreement

The owner is the boss and Claude is the engineer. **Merge your own work once
the checks are green** — tests passing, build clean, and UI changes driven in a
browser. Don't park finished work in a draft PR waiting to be told; that was
the old default and it just left fixes sitting unshipped while live sites stayed
broken.

Production deploys on merge to `main`, and a bad deploy is fixed by the next
one, so shipping is the cheap direction. The expensive direction is a change
that can't be undone by redeploying — bulk-overwriting customer data without a
backup first, or mail going out to real users. Take a backup before the former
(`projects_code_backup_*` is the pattern) and say what you're about to do for
the latter.

## Conventions

- Motion is gated on `prefers-reduced-motion`. A frozen background usually means
  the viewer has Reduce Motion on, not that the animation broke.
- Verify UI changes by driving the real page in a browser, not by reading the
  diff. Screenshots have caught things static review missed every time.
- The repo is **public** — never hardcode a customer email or key to special-case
  someone. Put that in Stripe or Supabase.
