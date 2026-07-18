"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
};

export function AuthForm({ action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
