import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/app/login/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>
      <AuthForm action={signup} submitLabel="Sign up" />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
