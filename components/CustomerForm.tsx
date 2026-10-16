"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { saveCustomer } from "@/app/(staff)/customers/actions";
import { keepValuesOnSubmit } from "@/lib/keep-form";
import { toast } from "./Toaster";

type Customer = {
  id: string; name: string; phone: string | null; email: string | null; deadline: string | null; notes: string | null;
};

const field = "flex flex-col gap-1";
const input = "w-full";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const [error, action, pending] = useActionState(async (_prev: string | null, fd: FormData) => {
    const res = await saveCustomer(fd);
    if ("error" in res) return res.error;
    toast("Customer saved");
    router.push(`/customers/${res.id}`);
    router.refresh();
    return null;
  }, null);

  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="grid gap-4 sm:grid-cols-2">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <label className={field}>Name
        <input name="name" required defaultValue={customer?.name} className={input} />
      </label>
      <p className="text-sm text-muted sm:col-span-2">Add a WhatsApp number, an email, or both.</p>
      <label className={field}>WhatsApp number
        <input name="phone" type="tel" placeholder="077 123 4567" defaultValue={customer?.phone ?? ""} className={input} />
      </label>
      <label className={field}>Email
        <input name="email" type="email" autoComplete="off" placeholder="name@example.com" defaultValue={customer?.email ?? ""} className={input} />
      </label>
      <label className={field}>Deadline (optional)
        <input name="deadline" type="date" defaultValue={customer?.deadline ?? ""} className={input} />
        <span className="text-xs">When they need it by</span>
      </label>
      <label className={`${field} sm:col-span-2`}>Notes
        <textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} className={input} />
      </label>
      {error && <p role="alert" className="text-danger sm:col-span-2">{error}</p>}
      <button disabled={pending} className="btn btn-primary sm:col-span-2">
        {pending ? "Saving…" : "Save customer"}
      </button>
    </form>
  );
}
