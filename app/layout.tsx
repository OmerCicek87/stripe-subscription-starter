import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pro SaaS Starter",
  description: "Stripe + Next.js + Supabase subscription starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold">
              Pro SaaS
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/account" className="hover:underline">
                Account
              </Link>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
