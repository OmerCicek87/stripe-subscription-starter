import { createServerSupabase } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/lib/supabase/types";

export type Entitlements = {
  plan: "free" | "pro";
  isPastDue: boolean;
};

const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Derives entitlements from the mirrored subscription rows. Reads only —
 * entitlements are NEVER granted anywhere but the webhook writer.
 *
 * pro  when the effective subscription status is active | trialing | past_due.
 * past_due is a grace period: still pro, but isPastDue drives the warning banner.
 * cancel_at_period_end + active stays pro until the period actually ends.
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sub = await getCurrentSubscription(userId);

  if (sub && PRO_STATUSES.has(sub.status)) {
    return { plan: "pro", isPastDue: sub.status === "past_due" };
  }

  return { plan: "free", isPastDue: false };
}

/**
 * Returns the most relevant subscription row for a user, or null. A pro/grace
 * status is preferred over inactive rows; otherwise the most recently updated.
 */
export async function getCurrentSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as SubscriptionRow[];
  if (error || rows.length === 0) {
    return null;
  }

  const active = rows.find((row) => PRO_STATUSES.has(row.status));
  return active ?? rows[0];
}
