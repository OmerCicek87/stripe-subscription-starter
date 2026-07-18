import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The webhook route writes through the service-role client. Swap it for the
// in-memory fake so we can assert on final table state.
vi.mock("@/lib/supabase/service", async () => {
  const fake = await import("./helpers/fakeSupabase");
  return { createServiceClient: fake.createServiceClient };
});

import { POST } from "@/app/api/stripe/webhook/route";
import { stripe } from "@/lib/stripe/client";
import { resetDb, activeDb } from "./helpers/fakeSupabase";
import {
  makeSubscription,
  asRetrieveResponse,
  makeEventPayload,
  signPayload,
  webhookRequest,
} from "./helpers/stripeFixtures";

function mockRetrieve(sub: ReturnType<typeof makeSubscription>) {
  return vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(asRetrieveResponse(sub));
}

beforeEach(() => {
  resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/stripe/webhook", () => {
  // 1
  it("rejects a request with no stripe-signature header (400)", async () => {
    const payload = makeEventPayload("customer.subscription.updated", { id: "sub_1" });

    const res = await POST(webhookRequest(payload, null));

    expect(res.status).toBe(400);
    expect(activeDb().tables.subscriptions).toHaveLength(0);
    expect(activeDb().tables.stripe_events).toHaveLength(0);
  });

  // 2
  it("rejects a tampered payload carrying an otherwise-valid signature (400)", async () => {
    const original = makeEventPayload("customer.subscription.updated", { id: "sub_1", amount: 1 });
    const signature = signPayload(original);
    const tampered = makeEventPayload("customer.subscription.updated", { id: "sub_1", amount: 999 });

    const res = await POST(webhookRequest(tampered, signature));

    expect(res.status).toBe(400);
    expect(activeDb().tables.stripe_events).toHaveLength(0);
  });

  // 3
  it("rejects a replayed event whose timestamp is outside the tolerance (400)", async () => {
    const payload = makeEventPayload("customer.subscription.updated", { id: "sub_1" });
    const tenMinutesAgo = Math.floor(new Date().getTime() / 1000) - 600;
    const signature = signPayload(payload, tenMinutesAgo);

    const res = await POST(webhookRequest(payload, signature));

    expect(res.status).toBe(400);
    expect(activeDb().tables.stripe_events).toHaveLength(0);
  });

  // 4
  it("upserts the RETRIEVED subscription, not the event payload snapshot", async () => {
    const db = activeDb();
    db.seed("billing_customers", [
      { user_id: "user_1", stripe_customer_id: "cus_1", created_at: "2024-01-01T00:00:00Z" },
    ]);

    // Event payload carries a STALE price; the fresh retrieve must win.
    const payload = makeEventPayload(
      "customer.subscription.updated",
      { id: "sub_1", customer: "cus_1", status: "past_due", items: { data: [{ price: { id: "price_STALE" } }] } },
      "evt_updated_1",
    );
    const retrieve = mockRetrieve(
      makeSubscription({ id: "sub_1", customer: "cus_1", status: "active", priceId: "price_FRESH" }),
    );

    const res = await POST(webhookRequest(payload, signPayload(payload)));

    expect(res.status).toBe(200);
    expect(retrieve).toHaveBeenCalledWith("sub_1");

    const rows = db.tables.subscriptions;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "sub_1",
      user_id: "user_1",
      status: "active",
      price_id: "price_FRESH",
    });
    expect(rows[0].price_id).not.toBe("price_STALE");

    const event = db.tables.stripe_events.find((e) => e.id === "evt_updated_1");
    expect(event?.status).toBe("processed");
  });

  // 5
  it("processes an event id once; a duplicate delivery is a no-op 200", async () => {
    const db = activeDb();
    db.seed("billing_customers", [
      { user_id: "user_1", stripe_customer_id: "cus_1", created_at: "2024-01-01T00:00:00Z" },
    ]);
    const retrieve = mockRetrieve(
      makeSubscription({ id: "sub_1", customer: "cus_1", status: "active", priceId: "price_FRESH" }),
    );

    const payload = makeEventPayload(
      "customer.subscription.updated",
      { id: "sub_1", customer: "cus_1" },
      "evt_dup_1",
    );

    const first = await POST(webhookRequest(payload, signPayload(payload)));
    expect(first.status).toBe(200);

    const second = await POST(webhookRequest(payload, signPayload(payload)));
    expect(second.status).toBe(200);

    // No second side effect: retrieve ran once, single subscription row.
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(db.tables.subscriptions).toHaveLength(1);
    expect(db.tables.stripe_events).toHaveLength(1);
  });

  // 6
  it("reprocesses an event left in 'received' by a prior crash, then marks it processed", async () => {
    const db = activeDb();
    db.seed("billing_customers", [
      { user_id: "user_1", stripe_customer_id: "cus_1", created_at: "2024-01-01T00:00:00Z" },
    ]);
    db.seed("stripe_events", [
      {
        id: "evt_crash_1",
        type: "customer.subscription.updated",
        status: "received",
        received_at: "2024-01-01T00:00:00Z",
      },
    ]);
    const retrieve = mockRetrieve(
      makeSubscription({ id: "sub_1", customer: "cus_1", status: "active", priceId: "price_FRESH" }),
    );

    const payload = makeEventPayload(
      "customer.subscription.updated",
      { id: "sub_1", customer: "cus_1" },
      "evt_crash_1",
    );

    const res = await POST(webhookRequest(payload, signPayload(payload)));

    expect(res.status).toBe(200);
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(db.tables.subscriptions).toHaveLength(1);
    const event = db.tables.stripe_events.find((e) => e.id === "evt_crash_1");
    expect(event?.status).toBe("processed");
  });

  // 7
  it("returns 500 and does NOT mark processed when handling throws mid-flight", async () => {
    const db = activeDb();
    db.seed("billing_customers", [
      { user_id: "user_1", stripe_customer_id: "cus_1", created_at: "2024-01-01T00:00:00Z" },
    ]);
    // Force a mid-processing failure.
    vi.spyOn(stripe.subscriptions, "retrieve").mockRejectedValue(new Error("stripe is down"));

    const payload = makeEventPayload(
      "customer.subscription.updated",
      { id: "sub_1", customer: "cus_1" },
      "evt_throw_1",
    );

    const res = await POST(webhookRequest(payload, signPayload(payload)));

    expect(res.status).toBe(500);
    expect(db.tables.subscriptions).toHaveLength(0);
    const event = db.tables.stripe_events.find((e) => e.id === "evt_throw_1");
    // Recorded but NOT processed, so Stripe's retry can finish the job.
    expect(event?.status).not.toBe("processed");
  });

  // 8
  it("creates the billing_customers mapping from metadata on checkout.session.completed", async () => {
    const db = activeDb();
    const retrieve = mockRetrieve(
      makeSubscription({ id: "sub_new", customer: "cus_new", status: "active", priceId: "price_FRESH" }),
    );

    const session = {
      id: "cs_1",
      object: "checkout.session",
      customer: "cus_new",
      subscription: "sub_new",
      client_reference_id: "user_new",
      metadata: { user_id: "user_new" },
    };
    const payload = makeEventPayload("checkout.session.completed", session, "evt_checkout_1");

    const res = await POST(webhookRequest(payload, signPayload(payload)));

    expect(res.status).toBe(200);
    expect(retrieve).toHaveBeenCalled();

    const mapping = db.tables.billing_customers.find((c) => c.stripe_customer_id === "cus_new");
    expect(mapping?.user_id).toBe("user_new");

    const sub = db.tables.subscriptions.find((s) => s.id === "sub_new");
    expect(sub?.user_id).toBe("user_new");

    const event = db.tables.stripe_events.find((e) => e.id === "evt_checkout_1");
    expect(event?.status).toBe("processed");
  });

  // 9
  it("records an unknown event type and returns 200 without side effects", async () => {
    const db = activeDb();
    const payload = makeEventPayload("charge.refunded", { id: "ch_1" }, "evt_unknown_1");

    const res = await POST(webhookRequest(payload, signPayload(payload)));

    expect(res.status).toBe(200);
    expect(db.tables.subscriptions).toHaveLength(0);
    const event = db.tables.stripe_events.find((e) => e.id === "evt_unknown_1");
    expect(event).toBeDefined();
    expect(event?.type).toBe("charge.refunded");
  });
});
