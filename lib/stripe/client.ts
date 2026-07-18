import Stripe from "stripe";

/**
 * The Stripe API version is pinned here in exactly one place (see README).
 * Pinning guarantees webhook payload shapes and API responses stay stable
 * across stripe-node upgrades until we consciously migrate.
 */
export const STRIPE_API_VERSION = "2025-02-24.acacia" satisfies Stripe.LatestApiVersion;

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});
