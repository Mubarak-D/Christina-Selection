"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-2xl">Christina Jewellers — staff</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Email
          <input name="email" type="email" autoComplete="email" required className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="rounded border px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          Sign in
        </button>
      </form>
    </main>
  );
}
