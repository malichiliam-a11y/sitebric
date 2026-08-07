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
- Password reset has not been walked end-to-end by a human since the fix landed.
- Check for duplicate `projects` rows from generation retries during the
  "Load failed" window — each retry created a new row and spent a generation.
- `/admin/referrals` estimates MRR from list price, so a discounted subscriber
  (APEX is on a $5-off coupon for 6 months) reads $5/mo high.

## Conventions

- Motion is gated on `prefers-reduced-motion`. A frozen background usually means
  the viewer has Reduce Motion on, not that the animation broke.
- Verify UI changes by driving the real page in a browser, not by reading the
  diff. Screenshots have caught things static review missed every time.
- The repo is **public** — never hardcode a customer email or key to special-case
  someone. Put that in Stripe or Supabase.
