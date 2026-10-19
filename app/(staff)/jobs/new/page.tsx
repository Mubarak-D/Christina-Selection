import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { SOURCES, SOURCE_LABEL } from "@/lib/jobcard";
import { createJob } from "../actions";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { customer } = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase.from("customers").select("id,name,phone,email").order("name");

  return (
    <>
      <BackLink href={customer ? `/customers/${customer}` : "/jobs"} label="Back" />
      <h1 className="mb-4 text-2xl">New job card</h1>
      <form action={createJob} className="flex max-w-xl flex-col gap-4">
        <label className="flex flex-col gap-1">Customer
          <select name="customer_id" required defaultValue={customer ?? ""}>
            <option value="" disabled>Choose a customer</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone ?? c.email})</option>)}
          </select>
        </label>
        <p className="-mt-2 text-sm text-muted">
          Not listed? <Link href="/customers/new" className="underline underline-offset-4">Add the customer</Link>, then press New job card on their page.
        </p>
        <label className="flex flex-col gap-1">Order came by
          <select name="source" required defaultValue="whatsapp">
            {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Due date
          <input type="date" name="due_date" />
        </label>
        <label className="flex flex-col gap-1">The customer&apos;s words
          <textarea name="customer_words" rows={6} placeholder="Paste the chat or message as written. Leave blank for a walk-in." />
        </label>
        <SubmitButton pendingLabel="Creating…">Create job card</SubmitButton>
      </form>
    </>
  );
}
