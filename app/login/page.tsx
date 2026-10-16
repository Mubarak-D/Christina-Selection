"use client";

import { useActionState } from "react";
import { keepValuesOnSubmit } from "@/lib/keep-form";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-6">
      <p className="wordmark mb-16 text-center">Christina Jewellers</p>
      <h1 className="display mb-10 text-center text-[1.75rem]">Staff sign in</h1>
      <form action={action} onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
