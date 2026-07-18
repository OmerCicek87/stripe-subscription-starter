import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// checkout.ts persists the billing_customers mapping through the service client.
vi.mock("@/lib/supabase/service", async () => {
  const fake = await import("./helpers/fakeSupabase");
  return { createServiceClient: fake.createServiceClient };
});

import { createCheckoutSession } from "@/lib/stripe/checkout";
import { stripe } from "@/lib/stripe/client";
import { resetDb } from "./helpers/fakeSupabase";
import type { PlanKey } from "@/lib/plans";

beforeEach(() => {
  resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createCheckoutSession", () => {
  // 10
  it("rejects unknown plan keys and maps a known key to its env-configured price", async () => {
    // --- unknown plan key must be rejected ---
    await expect(
      createCheckoutSession("user_1", "user@test.dev", "definitely_not_a_plan" as unknown as PlanKey),
    ).rejects.toThrow();

    // --- known plan key maps to the env price and sets client_reference_id ---
    vi.spyOn(stripe.customers, "create").mockResolvedValue({
      id: "cus_new",
    } as unknown as Stripe.Response<Stripe.Customer>);

    const sessionsCreate = vi.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.test/session/cs_test_1",
    } as unknown as Stripe.Response<Stripe.Checkout.Session>);

    const result = await createCheckoutSession("user_1", "user@test.dev", "pro_monthly");

    expect(result.url).toBe("https://checkout.stripe.test/session/cs_test_1");

    expect(sessionsCreate).toHaveBeenCalledTimes(1);
    const params = sessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;

    expect(params.mode).toBe("subscription");
    expect(params.client_reference_id).toBe("user_1");
    // STRIPE_PRICE_PRO_MONTHLY from tests/setup.ts
    expect(params.line_items?.[0]?.price).toBe("price_monthly_env");
  });
});
