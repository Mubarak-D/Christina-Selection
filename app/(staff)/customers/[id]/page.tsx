import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "@/components/CustomerForm";

const day = (t: string | null) => (t ? new Date(t).toLocaleDateString("en-LK", { timeZone: "Asia/Colombo" }) : "-");

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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl">{customer.name}</h1>
        <span className="flex flex-col text-right text-muted">
          {customer.phone && <span>{customer.phone}</span>}
          {customer.email && <span>{customer.email}</span>}
          {customer.deadline && (
            <span className="text-gold-ink">
              Needed by {new Date(`${customer.deadline}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC" })}
            </span>
          )}
        </span>
      </div>

      <h2 className="mb-2 text-xl">Sets</h2>
      <Link href={`/sets/new?customer=${customer.id}`} className="mb-4 inline-block underline">New set for {customer.name}</Link>
      {!sets?.length && <p className="mb-6">No sets sent yet.</p>}
      <table className="mb-8 w-full text-left text-sm">
        {!!sets?.length && (
          <thead><tr><th>Set</th><th>Sent</th><th>Chosen</th><th>Status</th></tr></thead>
        )}
        <tbody>
          {sets?.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="py-2"><Link href={`/sets/${s.id}`} className="underline">{s.title || "Selection"}</Link></td>
              <td>{day(s.sent_at)}</td>
              <td>{s.submitted_at ? s.set_items.filter((i) => i.status === "chosen").length : "-"}</td>
              <td>{s.handled_at ? "Handled" : s.submitted_at ? "Chosen" : s.sent_at ? "Waiting" : "Not sent"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-xl">Details</h2>
      <CustomerForm customer={customer} />
    </>
  );
}
