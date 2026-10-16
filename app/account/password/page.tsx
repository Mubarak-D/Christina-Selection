"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";

export default function SetPasswordPage() {
  const [error, action, pending] = useActionState(setPassword, null);
  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-6">
      <p className="wordmark mb-16 text-center">Christina Jewellers</p>
      <h1 className="display mb-10 text-center text-[1.75rem]">Choose your password</h1>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={10} required />
        </label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save password"}
        </button>
      </form>
    </main>
  );
}
