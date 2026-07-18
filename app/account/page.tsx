import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentSubscription, getEntitlements } from "@/lib/entitlements";
import { logout } from "@/app/auth/actions";
import { ManageBillingButton } from "./ManageBillingButton";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AccountPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ plan, isPastDue }, sub] = await Promise.all([
    getEntitlements(user.id),
    getCurrentSubscription(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Plan</span>
          <span className="font-medium capitalize">{plan}</span>
        </div>

        {sub ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Status</span>
              <span className="font-medium">{sub.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">
                {sub.cancel_at_period_end ? "Ends on" : "Renews on"}
              </span>
              <span className="font-medium">{formatDate(sub.current_period_end)}</span>
            </div>
            {sub.cancel_at_period_end ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your subscription is set to cancel at the end of the current period.
              </p>
            ) : null}
            {isPastDue ? (
              <p className="text-sm text-red-600">
                Your last payment failed. Update your payment method to avoid losing access.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You are on the free plan.
          </p>
        )}
      </section>

      {sub ? <ManageBillingButton /> : null}

      <form action={logout}>
        <button type="submit" className="text-sm text-neutral-500 underline">
          Log out
        </button>
      </form>
    </div>
  );
}
