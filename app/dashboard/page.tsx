import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/entitlements";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan, isPastDue } = await getEntitlements(user.id);
  const isPro = plan === "pro";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/*
        The success redirect is optimistic ONLY. Entitlements come from the
        webhook, never from this query param — the feature block below reads the
        mirrored subscription, not `?checkout=success`.
      */}
      {checkout === "success" ? (
        <div className="rounded border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Payment processing… your Pro access will unlock automatically once
          Stripe confirms the subscription.
        </div>
      ) : null}
      {checkout === "cancelled" ? (
        <div className="rounded border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          Checkout cancelled. No charge was made.
        </div>
      ) : null}

      {isPastDue ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Your last payment failed. Please{" "}
          <Link href="/account" className="underline">
            update your payment method
          </Link>{" "}
          to keep your Pro access.
        </div>
      ) : null}

      <section className="rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Pro-only feature</h2>
        {isPro ? (
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            🎉 Unlocked. This block is only visible to subscribers.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              🔒 Locked. Subscribe to Pro to unlock this feature.
            </p>
            <Link href="/" className="text-sm underline">
              View plans
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
