/* eslint-disable @typescript-eslint/no-explicit-any */
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";

const SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

/** Build a Stripe.Subscription-shaped object for `subscriptions.retrieve` mocks. */
export function makeSubscription(overrides: {
  id?: string;
  customer?: string;
  status?: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: number;
} = {}): Stripe.Subscription {
  const currentPeriodEnd =
    overrides.currentPeriodEnd ?? Math.floor(new Date("2030-01-01T00:00:00Z").getTime() / 1000);
  const sub = {
    id: overrides.id ?? "sub_123",
    object: "subscription",
    customer: overrides.customer ?? "cus_123",
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    current_period_end: currentPeriodEnd,
    items: {
      object: "list",
      data: [
        {
          id: "si_123",
          object: "subscription_item",
          current_period_end: currentPeriodEnd,
          price: { id: overrides.priceId ?? "price_from_stripe", object: "price" },
        },
      ],
    },
  };
  return sub as unknown as Stripe.Subscription;
}

/** Wrap a subscription as a Stripe.Response for `mockResolvedValue`. */
export function asRetrieveResponse(sub: Stripe.Subscription): Stripe.Response<Stripe.Subscription> {
  return sub as unknown as Stripe.Response<Stripe.Subscription>;
}

/** Build an event envelope and return the raw JSON string (what Stripe signs). */
export function makeEventPayload(type: string, object: unknown, id = "evt_test_1"): string {
  const event = {
    id,
    object: "event",
    api_version: "2025-02-24.acacia",
    type,
    data: { object },
  };
  return JSON.stringify(event);
}

/** Produce a valid `stripe-signature` header for a raw payload. */
export function signPayload(payload: string, timestampSeconds?: number): string {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret: SECRET,
    ...(timestampSeconds !== undefined ? { timestamp: timestampSeconds } : {}),
  });
}

/** Construct the Request the webhook route receives. */
export function webhookRequest(payload: string, signature: string | null): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new Request("https://app.test/api/stripe/webhook", {
    method: "POST",
    headers,
    body: payload,
  });
}
