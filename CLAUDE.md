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
| `lib/lead-script.js` | The words to say on a cold call, built from a lead's own facts — pure, no model call |
| `lib/leads-csv.js` | The saved-leads download, with the Excel formula-injection guard |
| `app/dashboard/LeadCards.js`, `LeadDetail.js` | The leads UI, split out so it can be driven in a browser without a login |

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
- `projects_code_backup_20260817` has RLS disabled and holds customer site
  code. The repo is public, so the anon key is public. Enabling RLS with no
  policies locks it to the service role, which is all that ever reads it:
  `alter table public.projects_code_backup_20260817 enable row level security;`
- Dashboard UI still can't be driven end-to-end here — there's no way to sign
  in from the sandbox. The leads components are verifiable because they were
  split into their own files; the rest of `dashboard-client.js` is not.

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
