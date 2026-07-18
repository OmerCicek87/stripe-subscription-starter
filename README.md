# SaaS Subscription Starter — Stripe + Next.js + Supabase

A minimal SaaS: a logged-in user subscribes via **Stripe Checkout** (hosted),
entitlements are mirrored into **Supabase** by webhooks, and billing is
self-served through the **Stripe Customer Portal**.

> **Drill mode.** This repo ships two files as interface-complete stubs for you
> to implement by hand:
>
> - `app/api/stripe/webhook/route.ts` — webhook verification + event processing
> - `lib/stripe/checkout.ts` — checkout + portal session creation
>
> The failing tests in `tests/webhook.test.ts` and `tests/checkout.test.ts`
> fully specify the required behavior. Make them pass without changing the tests.
> Everything else in the app is already built.

## Stack

- Next.js 15 (App Router, TypeScript `strict`)
- Tailwind CSS v4
- Supabase — Auth (email + password) + Postgres, via `@supabase/ssr`
- `stripe` (stripe-node)
- Vitest
- Deploy target: Vercel. All Stripe routes `export const runtime = "nodejs"`.

### Pinned Stripe API version

The Stripe API version is pinned in exactly one place —
`lib/stripe/client.ts` — as:

```
2025-02-24.acacia
```

Pinning keeps webhook payload shapes and API responses stable across
`stripe-node` upgrades until you consciously migrate.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values (see table below)
npm run dev
```

Then, in a separate terminal, forward Stripe webhooks to your dev server (see
**Local development with the Stripe CLI**).

### Database

Apply the single migration in `supabase/migrations/0001_init.sql` to your
Supabase project (via the Supabase SQL editor or `supabase db push`). It creates
`billing_customers`, `subscriptions`, and `stripe_events`, all with RLS enabled:
users may only **read** their own rows; every write happens through the
service-role client in server code.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | client + server | Base URL for Stripe success/cancel/return redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS; used only for webhook/portal writes |
| `STRIPE_SECRET_KEY` | **server only** | Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | **server only** | Verifies incoming webhook signatures |
| `STRIPE_PRICE_PRO_MONTHLY` | server | Price id the `pro_monthly` plan key maps to |
| `STRIPE_PRICE_PRO_YEARLY` | server | Price id the `pro_yearly` plan key maps to |

`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` must never appear in the
client bundle. They are only read inside server-only modules
(`lib/supabase/service.ts` is marked `import "server-only"`).

## Product model

One product, two prices: **Pro Monthly (€9)** and **Pro Yearly (€90)**. Free
tier = no subscription row. The client only ever sends a **logical plan key**
(`pro_monthly` | `pro_yearly`); the server maps it to an env-configured price id
and rejects unknown keys. The client never sends a raw price id.

## Local development with the Stripe CLI

1. Create the product + prices once, and save the `price_...` ids into
   `.env.local`:

   ```bash
   stripe login
   stripe products create --name "Pro"
   stripe prices create --product prod_XXX --currency eur --unit-amount 900  -d "recurring[interval]=month"
   stripe prices create --product prod_XXX --currency eur --unit-amount 9000 -d "recurring[interval]=year"
   ```

2. Every dev session, forward webhooks to your local route:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   This prints `Your webhook signing secret is whsec_...`. Put **that** value in
   `.env.local` as `STRIPE_WEBHOOK_SECRET`.

> ⚠️ **The local and dashboard webhook secrets are different.** The secret from
> `stripe listen` is only for local forwarding. When you add a webhook endpoint
> in the Stripe Dashboard (for your deployed app), it has its **own** separate
> `whsec_...` secret — copy that one into your Vercel environment. Using the CLI
> secret in production (or vice-versa) will fail signature verification.

Useful during testing:

```bash
stripe trigger customer.subscription.updated   # fire a canned fixture event
stripe events resend evt_XXX                    # re-deliver a past event (duplicate/ordering tests)
stripe logs tail                                # watch API calls live
```

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

## Acceptance criteria (for the drill)

- Entitlements are **never** granted from the success redirect — only the
  webhook writer touches `subscriptions`. The success page shows optimistic
  "processing" UI at most.
- The webhook route uses the **raw** request body. Do not parse JSON before
  verifying the signature (doing so breaks the tests).
- All 10 tests pass, `tsc --noEmit` is clean, and there is no `any` in the two
  drill files.
