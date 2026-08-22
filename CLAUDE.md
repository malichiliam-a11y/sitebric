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
| `lib/booking.js` | The link a caller gets texted to pick a time — pure, https-only, no calendar integration |
| `lib/twilio-sms.js` | Sends that text. Runs mid-call, so it never throws and never hangs |
| `lib/voices.js` | The eight voices a line can speak in — an allowlist, because an unknown name silently becomes Twilio's robot |
| `lib/site-styles.js` | The seven looks a site can be built in — the allowlist the prompt fragment is read from |
| `lib/lead-script.js` | The words to say on a cold call, built from a lead's own facts — pure, no model call |
| `lib/leads-csv.js` | The saved-leads download, with the Excel formula-injection guard |
| `app/dashboard/LeadCards.js`, `LeadDetail.js` | The leads UI, split out so it can be driven in a browser without a login |
| `app/try/` | The receptionist in a browser — orb UI, no login, no phone. `node test/try-ui.mjs` drives it |
| `lib/demo-chat.js` | The demo's fictional business and its turn limits. Runs the REAL `systemPrompt` |
| `app/dashboard/PageShell.js` | The frame every tab sits in — full width, panels flowing into columns. `app/dev/shell/` + `node test/shell-ui.mjs` drive it |
| `app/dev/receptionist/` | The receptionist screen in every plan state, with no login. 404 in production. `node test/receptionist-ui.mjs` drives it |
| `lib/entitlements.js` | What keeps working after the money stops — grace periods, number release. Pure. **Fails OPEN**, unlike `lib/plans.js` |
| `lib/owner-state.js` | The one impure part: looks up a site owner's standing with the service role |
| `lib/offline-page.js` | What a lapsed site's visitors see. 503, never 404 |
| `app/api/cron/reclaim/` | Hands numbers back to Twilio 30 days after a cancellation — the thing that stops the bill |
| `lib/domain-status.js` | What a connected custom domain is actually doing — pure, reads Vercel's answer, never calls it |
| `app/dashboard/DomainStatus.js`, `app/dev/domain/` | The domain panel and its harness. `node test/domain-ui.mjs` drives it |

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

**"Connected" is not a state, it's a wish.** The dashboard printed
"Connected domain: theirsite.com" the moment `/api/connect-domain` wrote
the row — but connecting only *registers* the domain with Vercel, and
registration does nothing until the domain's nameservers point at Vercel.
A reseller read "connected", told a client the job was done, and then had
to explain twelve hours of a dead website they had already been paid for.
`lib/domain-status.js` now reads the two facts that decide it (`verified`
on the project domain, `misconfigured` on the domain config) and the panel
names the real state. Everything uncertain resolves *downwards*: a failed
Vercel call, a missing field, a `misconfigured` that isn't literally
`false` — all render as "not ready", never as live. A false "live" is the
only failure here that costs somebody their reputation with a client.

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
- **An unrecognised voice name does not error — it becomes the robot.**
  Twilio silently falls back to its own 2005-era synthesiser, so a typo in
  a voice is invisible until a caller hears it. Everything goes through
  `voiceFor()` in `lib/voices.js`, which is an allowlist and returns the
  default for anything else. The voice is per line and set from the
  dashboard, because which one sounds human is decided by ringing the
  number, not in a code review.
- **`<Say>` must never be nested inside `<Gather>`.** That is Twilio's
  barge-in mode: recognition starts while the prompt is still playing, so
  on any line with echo the assistant transcribes its own voice as the
  caller. It did exactly that on the first real call, burning three of six
  turns before the caller got a word in. The cost of the fix is that a
  caller cannot interrupt, which is why replies are capped at 70 tokens.
- **`[[DONE]]` is the model's opinion, not the caller's.** It fires as
  soon as there is a name, a number and a reason — routinely while the
  caller is still asking things. A finish speaks its line, asks "anything
  else?", and only ends on a clear decline. `isDecline` fails toward
  staying on the line on purpose.
- **Booking is a texted link, not a calendar integration.** An assistant
  cannot fill in a form over the phone, and reading live availability
  aloud would mean holding an OAuth token for every client of every
  reseller. Texting the link mid-call gets the same result, works with
  any provider, and breaks when nobody's API changes. `[[BOOK]]` is
  checked before `[[DONE]]` — a caller who just said "yes, text me" is
  not finished, and must not be hung up on in the same breath.
- **The receptionist is currently LOCKED.** `lib/feature-lock.js` hides
  the dashboard tab, the `/try` demo and all provisioning from everyone
  except the owner, and it **defaults to locked** — it was added as a
  holding measure before a day off and is meant to come off. Lift it with
  `RECEPTIONIST_LOCKED=0`, or delete the module's use, which is the
  tidier end state. It deliberately does NOT stop a line that is already
  answering: there is a real customer with a number on this account.
- **`/try` is public and spends money on strangers.** It is the only
  route where someone who has never signed up can burn Anthropic credit,
  and the balance it burns is the same one site generation runs on — so
  an unbounded demo would take down the product it exists to sell. Capped
  per conversation and per IP per day, counted server-side because the
  browser posts the transcript back and could simply send a shorter one.
  The limiter fails OPEN: a prospect hitting an error is a lost customer,
  a few uncounted turns is a few cents.
- **The demo runs the real prompt.** Same `systemPrompt`, same fenced
  facts, same guardrail. A demo that behaves better than the phone line
  is a lie told to a prospect, and they find out after they have sold it.
- **One number is public.** The row with `is_demo` is shown to every user
  on every plan, including accounts that can't use the feature — hearing
  it is what sells it. It is therefore the only number a stranger can
  dial, so it carries its own caps: `DEMO_CALLS_PER_DAY` per calling
  number and a lower turn ceiling. Only the owner can nominate one.

## When someone stops paying

Cancelling used to set `plan: "none"` and stop there. Nothing read it, so
every published site stayed live forever on a cancelled account and every
receptionist number kept renting from Twilio against no revenue — the only
cost in this product that grows on its own and never stops.

`customer.subscription.deleted` now stamps `profiles.plan_ended_at`, and
`lib/entitlements.js` measures everything from it:

| | When |
|---|---|
| Sites and receptionist keep working | `GRACE_DAYS` = 3 |
| Then sites 503 and the receptionist stops answering | after that |
| Numbers handed back to Twilio | `NUMBER_RELEASE_DAYS` = 30 |

Things that will bite:

- **`lib/entitlements.js` fails OPEN; `lib/plans.js` fails CLOSED.** They
  are opposite on purpose. Entitlements decides whether something already
  sold keeps working, and getting that wrong takes a *paying* customer's
  client's business offline. Plans decides whether someone may create
  something new, and getting that wrong gives away a paid feature. Never
  swap the defaults.
- **Grace is not generosity — it's Stripe.** A declined or expired card
  ends a subscription through the same `subscription.deleted` event as a
  deliberate cancellation. At zero days, one bounced payment would black
  out every one of that reseller's clients before they could notice.
- **Nothing is deleted.** Sites stop being *served*; the code stays. A
  resubscribe clears `plan_ended_at` and everything is back in seconds.
  The single exception is releasing a number, which is irreversible — the
  number can be reissued to somebody else and any business forwarding to
  it has a dead phone. That is why it waits ten times longer than the
  sites do, and why `test/serving-gate.mjs` asserts the gap.
- **The offline page is written for the client's customers, not for us.**
  It doesn't say "unpaid", doesn't name Sitebric, and returns **503 with
  `noindex`, never 404** — a 404 tells Google to drop the business from
  the index, which outlasts the missed payment by months and isn't undone
  by paying up. Punishing a business for its web guy's card is not a
  collection strategy.
- **A lapsed receptionist line still forwards to the business.** The
  person on the phone is some plumber's actual customer with an actual
  problem. The reseller loses the AI they stopped paying for; nobody's
  customer gets hung up on to make the point.
- **The demo line is exempt from all of it** — it belongs to Sitebric, not
  to a customer, and it is what sells the feature.

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
- **`www.` is never registered.** `/api/connect-domain` adds the apex only, so
  every client whose customers type `www.theirsite.com` gets a 404 even when the
  bare domain is live. The fix is to register both and let Vercel redirect one to
  the other; it hasn't been done because it changes what a paid action buys.
- `/admin/referrals` estimates MRR from list price, so a discounted subscriber
  (APEX is on a $5-off coupon for 6 months) reads $5/mo high.
- **The per-number add-on is still unbuilt.** At 25 lines a Pro subscriber
  costs roughly $29/month in Twilio rent against $69.99 of revenue. Still
  profit, but that tier is where a per-line charge stops being optional.
  Nobody is near the cap yet, so this is a watch item, not a fire.
- **Only Settings uses `PageShell` so far.** Overview, Sites, Leads,
  Invoices, Billing, Referrals and Profile still carry their own
  container, and five of them are still pinned at `maxWidth: 640` — less
  than half a laptop window. Converting one is mechanical: header text
  becomes `title`/`subtitle`, the card stack gets wrapped in `PageGrid`,
  and each card drops its `marginBottom` because the grid gap does that
  job. Do them one at a time, not in a batch.
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
