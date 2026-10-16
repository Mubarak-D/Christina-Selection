"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";

export default function SetPasswordPage() {
  const [error, action, pending] = useActionState(setPassword, null);
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-6 text-2xl">Choose your password</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={10} required className="rounded border px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          Save password
        </button>
      </form>
    </main>
  );
}
