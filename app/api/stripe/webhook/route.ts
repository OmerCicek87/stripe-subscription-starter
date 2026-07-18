// =============================================================================
// DRILL FILE 1 — implement by hand. Do NOT let Claude Code fill this in.
// The failing tests in tests/webhook.test.ts fully specify the required behavior.
// =============================================================================

export const runtime = "nodejs";

/**
 * Stripe webhook handler. Stripe's signature IS the authentication — there is no
 * other auth middleware on this route. The route must consume the RAW request
 * body; do not add a JSON body parse before signature verification (a JSON parse
 * before verify will break the tests, by design).
 *
 * Implement the following (see 01-SPEC.md §"DRILL FILE 1" and tests/webhook.test.ts):
 *
 *   1. SIGNATURE VERIFICATION
 *      - Read the raw body with `await req.text()` and the `stripe-signature` header.
 *      - Verify with `stripe.webhooks.constructEvent(rawBody, signature, secret)`
 *        using `process.env.STRIPE_WEBHOOK_SECRET`.
 *      - Missing signature header, tampered payload, or a timestamp outside the
 *        tolerance (replay) → respond 400. Nothing is written.
 *
 *   2. IDEMPOTENCY (via the `stripe_events` table)
 *      - Record `(event.id, event.type)` with an "on conflict do nothing" write.
 *      - If a row already exists with status = 'processed' → return 200 WITHOUT
 *        reprocessing (no second side effect).
 *      - If a row exists with status = 'received' (a previous attempt crashed
 *        before finishing) → process it again.
 *
 *   3. EVENT HANDLING — handle these types:
 *        checkout.session.completed
 *        customer.subscription.created
 *        customer.subscription.updated
 *        customer.subscription.deleted
 *        invoice.payment_failed   (log only — the status change arrives via
 *                                  a subscription.updated event)
 *      - Any other (unknown) type → record it and return 200.
 *
 *   4. ORDERING SAFETY
 *      - Treat subscription events as a "poke", not a source of truth. For
 *        created/updated, RETRIEVE the subscription fresh from the Stripe API
 *        (`stripe.subscriptions.retrieve`) and upsert THAT — never trust the
 *        event payload's (possibly stale/out-of-order) snapshot.
 *      - `customer.subscription.deleted` MAY use the event payload directly.
 *
 *   5. USER RESOLUTION
 *      - Map the Stripe customer → user_id via `billing_customers`
 *        (by `stripe_customer_id`).
 *      - If no mapping exists yet (e.g. first `checkout.session.completed`),
 *        fall back to `client_reference_id` / subscription metadata `user_id`
 *        from the checkout session, and INSERT the mapping.
 *
 *   6. WRITES
 *      - Every DB write goes through the service-role client
 *        (`createServiceClient()` from `@/lib/supabase/service`).
 *
 *   7. COMPLETION
 *      - On success, mark the `stripe_events` row `processed` and return 200.
 *      - On a processing error, do NOT mark it processed — return 500 so Stripe
 *        retries later.
 *
 * No `any`. Keep the raw-body contract intact.
 */
export async function POST(_req: Request): Promise<Response> {
  // TODO: implement per the contract above and tests/webhook.test.ts.
  return new Response("Not implemented", { status: 501 });
}
