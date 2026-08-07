# Session handoff — 2026-08-06/07

Everything done in one long working session, so a fresh session doesn't have to
rediscover it. Durable conventions live in `CLAUDE.md`; this is the record of
what changed, why, and what's still open.

---

## 1. Signup was completely broken — nobody could create an account

**Symptom:** "the email doesn't send or work."

**What it actually was:** delivery was fine. Every confirmation email was being
sent and delivered — Resend showed `delivered` on all of them. The problem was
the *content*. Supabase's template mails a **6-digit code**:

> Your Sitebric login code is: 417383 — enter this code on the sign-in screen.

But the login page had been redesigned to email+password with **no screen to
enter a code**. `signUp` returned no session, the UI said "check your email to
confirm your account," and there was nowhere to put the code. A total dead end.

Visible in the auth log — a real signup lost to it:

```
03:31:57  /signup   user_confirmation_requested   <a real prospect>
03:33:38  /signup   user_confirmation_requested   (tried again)
03:34:35  /authorize                              (gave up, used Google)
```

**Fix** (`app/components/login/AuthCard.tsx`): collect the code the template
already sends rather than rewriting the template. Added a `verify` mode wired to
`verifyOtp`, which returns a session directly so the user lands in the dashboard
already logged in. Confirmed working in the auth log: `/verify → user_signedup`,
23 seconds after signup.

**Two follow-on cases**, both of which look like bugs and aren't:

- **Already-registered address.** Returns a session-less user with an **empty
  `identities` array** and sends no mail at all — Supabase won't confirm or deny
  the account exists. This was parking users on a code screen forever. Now routes
  back to login with the address pre-filled.
- **Accounts created during the broken window.** A login failing with
  `email_not_confirmed` now re-sends a code and goes to verify, so nobody is
  permanently locked out.

## 2. Password reset dumped users on the login page

The reset **template was fine** — a proper link, not a code. But the mail showed
`redirect_to=https://sitebric.com`, not `/reset-password`. Supabase silently
replaces `redirect_to` with the bare Site URL when the requested URL isn't in the
project's allowed Redirect URLs.

So the link landed users on the login form holding a live recovery session:
signed in, but with no way to set the password they came to change — they'd have
to reset again every time.

`AuthCard` now detects a recovery landing (a `code` param, or `type=recovery` in
query or hash) and forwards to `/reset-password` with the token intact. This also
covers Vercel preview deploys, whose hostnames will never be in the allow-list.

Verified: recovery links forward with the token; a plain load and a `?ref=APEX`
referral link are both left alone.

## 3. The `<style>` hydration bug — shipped three separate times

React escapes `<`, `>`, `'` and `"` in the **text child** of a `<style>` tag, so
server and client markup disagree, React discards the server render, and the
entire page falls back to client rendering. No error surfaces to the user; it
just feels slow and dead.

Found and fixed in three places:

| File | Trigger |
|---|---|
| Login components | apostrophes in CSS comments, then a quoted `'Inter'` font stack |
| `app/dashboard/dashboard-client.js` | 7 hydration errors per load |
| `app/pricing/page.js` | `syntax: '<angle>'` in an `@property` rule |

All now use `dangerouslySetInnerHTML`. **Never write ``<style>{`...`}</style>``
in this codebase.** No instances remain.

## 4. "Load failed" when generating a site with an image

**Cause:** `app/api/generate/route.js` requested `max_tokens: 32000` on a
**non-streaming** call. Anthropic's guidance puts the streaming threshold at
~16k — a buffered request that large runs long enough to hit HTTP timeouts. The
connection dies mid-generation, so there's no response to read and no server
error to show; the browser reports a bare "Load failed." Photos make it worse
because both the prompt and the generated markup grow.

**Fix:** switched to the official `@anthropic-ai/sdk` with `.stream()` +
`.finalMessage()`. Also:

- A dropped connection no longer reads as a failed generation on the client. The
  project row is created *before* the model is called and the server keeps
  working after the browser gives up — the old error invited a resubmit that
  created a duplicate site and spent a second generation.
- A `max_tokens` stop now fails loudly instead of saving a truncated page.

## 5. Account deletion did nothing

The button raised `alert("Account deletion isn't wired up yet")` while
`/api/delete-account` was **fully implemented** behind it — cancels the Stripe
subscription, deletes projects, profile, then the auth user. Someone wrote the
hard part and never connected the button.

Now wired, gated behind typing `DELETE`, and it clears the local session
afterward so the app can't reuse a token for a deleted account. Verified the
gate refuses to arm on empty or wrong input, and that cancel returns to a safe
state.

## 6. Design work

- **Login/landing rebuilt** in TypeScript + Tailwind + Framer Motion against a
  supplied render. Both `/` and `/login` render one shared `LoginScreen`, which
  fixed a bug where the two routes had diverged and the root URL silently skipped
  referral capture.
- **Live terrain backdrop** (`TerrainField.tsx`) — a perspective-projected point
  field, dunes plus travelling swells that roll from the horizon toward the
  viewer. Measured at +11px vertical drift per 500ms with 0px horizontal.
  **21fps → 61fps**: the single biggest win was removing `backdrop-filter` from
  the auth card, which forced a full re-blur every frame once the background
  animated.
- **Multi-section landing restored** — How it works, FAQ, closing CTA had been
  collapsed away in the redesign. Original copy carried over verbatim.
- **Nav fixed** — "Documentation" pointed at a section that didn't exist, and the
  brightness toggle had no handler at all (the app is dark-only). Replaced with
  four links that resolve. Also gave `/pricing` a header; it had zero links, so
  anyone arriving from the nav was stranded.
- **Black is actually black now.** The surface ramp topped out at `#161616` —
  charcoal. The other culprit was the backdrop render at 85% opacity washing
  everything grey; it's at 50%.
- **Dashboard** picked up the login's mote field, a specular sweep, glow on
  hover, and film grain.

## 7. Referral + billing

- `/admin/referrals` reports signups, paid count, MRR and 25% commission for
  APEX. It estimates MRR from **list price**, so a discounted subscriber reads
  high.
- Checkout now sets `allow_promotion_codes: true` — there was previously no way
  to apply a discount at all.
- **APEX's discount is live in Stripe** (not in this repo — it's public):
  coupon `MfWwUyNb`, $5.00 off, repeating **6 months**, restricted to the Starter
  product. Single-use promotion code **`AX9K42-STR7Q`**, max 1 redemption. Net
  $10/mo for 6 months, then rolls to $15 automatically.

## 8. Mobile

Viewport meta tag was missing entirely — iOS rendered at a fake ~980px width.
Generated sites now get the tag too. The preview `<iframe>` collapsed to ~150px
because percentage heights don't resolve through flex chains on replaced
elements; fixed with `position: absolute; inset: 0`.

---

## Still open

1. **Add `https://sitebric.com/**` to Supabase → Authentication → URL
   Configuration.** The code works around its absence; this fixes the cause and
   covers anything added later.
2. **Password reset has never been walked end-to-end by a human** since the fix
   landed. Everything else in the auth flow is confirmed against live logs.
3. **Check `projects` for duplicate rows** created by retries during the "Load
   failed" window — each retry made a new row and spent a generation.
4. **`claude-sonnet-4-6` is the generation model.** Current and valid; changing
   it is a cost decision, not a bug fix.

## Not bugs — don't go chasing these

- **A frozen background means the viewer has Reduce Motion enabled.** The owner's
  Windows PC has it on. Settings → Accessibility → Visual effects → Animation
  effects. All motion in the app is correctly gated on `prefers-reduced-motion`.
- **Connectors (Supabase, Stripe, Vercel, Resend) drop and reconnect as a group.**
  Accounts stay linked throughout; it's the session's attachment that cycles.
  They attach cleanly at session start.
