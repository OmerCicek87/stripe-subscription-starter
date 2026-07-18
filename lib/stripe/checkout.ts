// =============================================================================
// DRILL FILE 2 — implement by hand. Do NOT let Claude Code fill this in.
// The failing test in tests/checkout.test.ts specifies the required behavior.
// =============================================================================

import type { PlanKey } from "@/lib/plans";

export type CheckoutSessionResult = { url: string };
export type PortalSessionResult = { url: string };

/**
 * Create a Stripe Checkout session for a subscription.
 *
 * Implement (see 01-SPEC.md §"DRILL FILE 2" and tests/checkout.test.ts):
 *   - Map the logical `plan` key → a Stripe price id via an ENV ALLOWLIST
 *     (STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_YEARLY). Throw on an unknown
 *     key — the client must never be able to pass a raw or unmapped price.
 *   - Get-or-create the Stripe customer: create with `metadata.user_id`, and
 *     PERSIST the `billing_customers` mapping BEFORE creating the session.
 *   - Create the session with:
 *       mode: "subscription"
 *       customer: <the resolved customer id>
 *       client_reference_id: userId
 *       subscription_data.metadata.user_id: userId
 *       allow_promotion_codes: true
 *       line_items: [{ price: <mapped price id>, quantity: 1 }]
 *       success_url: `${APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
 *       cancel_url:  `${APP_URL}/dashboard?checkout=cancelled`
 *     (APP_URL = process.env.NEXT_PUBLIC_APP_URL)
 *   - Return `{ url }` from the created session.
 *
 * No `any`.
 */
export async function createCheckoutSession(
  _userId: string,
  _email: string,
  _plan: PlanKey,
): Promise<CheckoutSessionResult> {
  // TODO: implement per the contract above and tests/checkout.test.ts.
  throw new Error("NOT_IMPLEMENTED: createCheckoutSession");
}

/**
 * Create a Stripe Billing Portal session so the user can self-serve billing.
 *
 * Implement:
 *   - Look up the `billing_customers` mapping for `userId`; throw if missing.
 *   - Create a billing-portal session with
 *       return_url: `${APP_URL}/account`
 *   - Return `{ url }`.
 *
 * No `any`.
 */
export async function createPortalSession(_userId: string): Promise<PortalSessionResult> {
  // TODO: implement per the contract above.
  throw new Error("NOT_IMPLEMENTED: createPortalSession");
}
