# Sitebric

AI-generated client websites for people who resell them. Next.js 14 +
Supabase (auth, database, photo storage) + Stripe (subscriptions) +
the Anthropic API (site generation).

Work through the steps below in order. Each one ends with something you
can check, so you find out immediately if a step didn't take.

---

## 1. Database

Supabase → SQL Editor → New query → paste all of `supabase/schema.sql` → Run.

This creates the `projects` and `profiles` tables, their row-level
security policies, and the `client-photos` storage bucket.

**Re-run this file after pulling changes.** It's written to be safe to
run repeatedly — it only adds what's missing — and skipping it is the
most common cause of "the button does nothing", because the app writes
columns the old schema didn't have.

✅ Check: Table Editor shows `projects` and `profiles`, and Storage
shows a `client-photos` bucket.

---

## 2. Auth

**URLs** — Supabase → Authentication → URL Configuration:
- Site URL: `https://sitebric.com` (your real domain)
- Redirect URLs: add `https://sitebric.com/**` and, for local work,
  `http://localhost:3000/**`

Email sign-in (the 6-digit code) works out of the box.

**Google sign-in** — both the landing page and `/login` show a
"Continue with Google" button. It will return an error until you enable
the provider: Supabase → Authentication → Providers → Google → enable,
then paste a client ID and secret from a Google Cloud OAuth 2.0 client.
That client's authorised redirect URI is:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

If you'd rather not set this up, delete the Google button from
`app/page.js` and `app/login/page.js` instead of shipping a button that
errors.

✅ Check: sign in with your email and land on `/dashboard`.

---

## 3. Stripe

**Prices** — create three recurring products, then put their price IDs
in `PRICE_IDS` in `lib/plans.js`.

> Test-mode and live-mode price IDs look identical but are not
> interchangeable. Live secret key + test price IDs = checkout fails.
> Copy the IDs while the dashboard's **View test data** toggle matches
> the key you're deploying with.

**Webhook** — Developers → Webhooks → Add endpoint:
- URL: `https://sitebric.com/api/stripe-webhook`
- Events: `checkout.session.completed`, `invoice.payment_succeeded`,
  `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

All four matter: the first grants the plan, the second resets monthly
usage on renewal, the third syncs plan changes made from the billing
portal, and the fourth downgrades on cancellation.

**Billing portal** — Settings → Billing → Customer portal. Turn on plan
switching if you want customers to upgrade themselves.

✅ Check: subscribe with test card `4242 4242 4242 4242`, then confirm
your `profiles` row shows the new plan.

---

## 4. Google Places (the Find Leads tab)

Google Cloud → enable **Places API (New)** → create an API key →
`GOOGLE_PLACES_API_KEY`.

Restrict the key to that one API. Billing must be enabled on the Google
Cloud project or every search returns an error.

✅ Check: Find Leads returns results for a city and category.

---

## 5. Deploy

Import the repo in Vercel, then add every variable from
`.env.local.example` under Settings → Environment Variables.

The build **fails** without `STRIPE_SECRET_KEY`, so a missing key shows
up as a failed deploy rather than a broken page.

**Domains** — Settings → Domains, add both:
- `sitebric.com`
- `*.sitebric.com` — the wildcard, which requires adding the CNAME
  Vercel gives you at your DNS provider

Without the wildcard, publishing a site appears to succeed but every
`<slug>.sitebric.com` link 404s. `middleware.js` routes any host that
isn't your own domain to the published-site handler.

✅ Check: publish a site, open its `<slug>.sitebric.com` link in a
private window, and see the generated page.

---

## Local development

```bash
cp .env.local.example .env.local   # then fill it in
npm install
npm run dev
```

Stripe webhooks can't reach localhost. To test billing locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

and use the signing secret that command prints.

---

## How it fits together

| Path | Does |
|---|---|
| `app/page.js` | Landing page with inline sign-in |
| `app/dashboard/` | The product: generate, edit, publish, leads, billing |
| `app/api/generate/` | Checks plan limits, calls Anthropic, saves the HTML |
| `app/api/edit/` | Applies a plain-English change to an existing site |
| `app/api/stripe-webhook/` | The only thing that writes plan + usage |
| `app/s/[id]/` | Serves a published site by id |
| `app/api/custom-domain-site/` | Serves a published site by domain or subdomain |
| `middleware.js` | Routes unknown hosts to the handler above |
| `lib/plans.js` | Plan limits and price IDs — one source of truth |

Plan limits live only in `lib/plans.js`. Change them there and both the
enforcing API routes and the dashboard display update together.
