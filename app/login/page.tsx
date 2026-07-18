import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthForm } from "./AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <AuthForm action={login} submitLabel="Log in" />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
