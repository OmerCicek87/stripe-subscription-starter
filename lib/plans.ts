/**
 * Logical plan keys. The client only ever sends one of these — never a raw
 * Stripe price id. The server maps the key to an env-configured price id
 * (see lib/stripe/checkout.ts). Unknown keys are rejected.
 */
export const PLAN_KEYS = ["pro_monthly", "pro_yearly"] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as readonly string[]).includes(value);
}

export const PLAN_LABELS: Record<PlanKey, string> = {
  pro_monthly: "Pro Monthly",
  pro_yearly: "Pro Yearly",
};

export const PLAN_PRICING: Record<PlanKey, { amount: string; interval: string }> = {
  pro_monthly: { amount: "€9", interval: "month" },
  pro_yearly: { amount: "€90", interval: "year" },
};
