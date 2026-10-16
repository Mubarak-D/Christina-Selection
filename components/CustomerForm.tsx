"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { saveCustomer } from "@/app/(staff)/customers/actions";

type Customer = {
  id: string; name: string; phone: string; birthday: string | null; anniversary: string | null; notes: string | null;
};

const field = "flex flex-col gap-1";
const input = "w-full";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const [error, action, pending] = useActionState(async (_prev: string | null, fd: FormData) => {
    const res = await saveCustomer(fd);
    if ("error" in res) return res.error;
    router.push(`/customers/${res.id}`);
    router.refresh();
    return null;
  }, null);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <label className={field}>Name
        <input name="name" required defaultValue={customer?.name} className={input} />
      </label>
      <label className={field}>WhatsApp number
        <input name="phone" type="tel" required placeholder="077 123 4567" defaultValue={customer?.phone} className={input} />
      </label>
      <label className={field}>Birthday
        <input name="birthday" type="date" defaultValue={customer?.birthday ?? ""} className={input} />
      </label>
      <label className={field}>Anniversary
        <input name="anniversary" type="date" defaultValue={customer?.anniversary ?? ""} className={input} />
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
