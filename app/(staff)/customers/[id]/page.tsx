import { BackLink } from "@/components/BackLink";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/CustomerForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Chat, ChevronRight, Mail } from "@/components/Icons";
import { formatDate } from "@/lib/dates";
import { deleteCustomer } from "../actions";

const STATUS = {
  handled: { label: "Handled", tone: "bg-line/60 text-muted" },
  chosen: { label: "Chosen", tone: "bg-gold/10 text-gold-ink" },
  waiting: { label: "Waiting", tone: "bg-ivory text-ink border border-line" },
  draft: { label: "Not sent", tone: "bg-ivory text-muted border border-dashed border-line" },
} as const;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) notFound();
  const { data: sets } = await supabase
    .from("selection_sets")
    .select("id,title,created_at,sent_at,submitted_at,handled_at,set_items(status)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  return (
    <>
      <BackLink href="/customers" label="Customers" />
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl">{customer.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {customer.phone && <span className="inline-flex items-center gap-1.5"><Chat />{customer.phone}</span>}
            {customer.email && <span className="inline-flex items-center gap-1.5 break-all"><Mail />{customer.email}</span>}
          </p>
          {customer.deadline && (
            <p className="mt-2 inline-block rounded-full bg-gold/10 px-3 py-1 text-sm text-gold-ink">
              Needed by {formatDate(customer.deadline)}
            </p>
          )}
        </div>
        <Link href={`/sets/new?customer=${customer.id}`} className="btn btn-primary self-start">New set</Link>
      </div>

      <h2 className="mb-3 text-xl">Sets</h2>
      {!sets?.length && (
        <p className="mb-8 rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">
          No sets yet. Use New set to send {customer.name.split(/\s+/)[0]} a selection.
        </p>
      )}
      <ul className="mb-10 flex flex-col gap-3">
        {sets?.map((s) => {
          const status = STATUS[s.handled_at ? "handled" : s.submitted_at ? "chosen" : s.sent_at ? "waiting" : "draft"];
          const chosen = s.set_items.filter((i) => i.status === "chosen").length;
          return (
            <li key={s.id}>
              <Link href={`/sets/${s.id}`}
                className="group flex items-center gap-4 rounded-xl border border-line bg-pearl px-4 py-3 hover:border-gold">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{s.title || "Selection"}</span>
                  <span className="block text-sm text-muted">
                    {s.sent_at ? `Sent ${formatDate(s.sent_at)}` : `Created ${formatDate(s.created_at)}`}
                    {s.submitted_at && ` · ${chosen} of ${s.set_items.length} chosen`}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${status.tone}`}>{status.label}</span>
                <span className="text-muted"><ChevronRight /></span>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-3 text-xl">Details</h2>
      <CustomerForm customer={customer} />

      <div className="mt-12 border-t border-line pt-6">
        <ConfirmButton action={deleteCustomer.bind(null, customer.id)} label="Delete customer"
          title={`Delete ${customer.name}?`}
          message={`${sets?.length ? `This also deletes their ${sets.length} ${sets.length === 1 ? "set" : "sets"}. ` : ""}This can't be undone.`} />
      </div>
    </>
  );
}
