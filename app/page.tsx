import { PLAN_PRICING, type PlanKey } from "@/lib/plans";
import { CheckoutButton } from "./CheckoutButton";

const CARDS: { plan: PlanKey; title: string; blurb: string }[] = [
  { plan: "pro_monthly", title: "Pro Monthly", blurb: "Everything in Pro, billed monthly." },
  { plan: "pro_yearly", title: "Pro Yearly", blurb: "Two months free, billed yearly." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Ship your SaaS this weekend</h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-600 dark:text-neutral-400">
          Stripe Checkout, Supabase auth, entitlements mirrored by webhooks, and
          self-serve billing through the Customer Portal.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {CARDS.map((card) => {
          const price = PLAN_PRICING[card.plan];
          return (
            <div
              key={card.plan}
              className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800"
            >
              <div>
                <h2 className="text-lg font-semibold">{card.title}</h2>
                <p className="mt-1 text-3xl font-bold">
                  {price.amount}
                  <span className="text-base font-normal text-neutral-500">/{price.interval}</span>
                </p>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{card.blurb}</p>
              <CheckoutButton plan={card.plan} label={`Choose ${card.title}`} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
