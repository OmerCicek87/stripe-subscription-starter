"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanKey } from "@/lib/plans";

type Props = {
  plan: PlanKey;
  label: string;
};

export function CheckoutButton({ plan, label }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {loading ? "Redirecting…" : label}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
