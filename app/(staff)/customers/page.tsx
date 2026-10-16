import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { phoneSearchDigits } from "@/lib/phone";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[,()%*\\]/g, "").trim();
  const supabase = await createClient();
  let query = supabase.from("customers").select("id,name,phone").order("name").limit(100);
  const digits = phoneSearchDigits(term);
  if (term) query = query.or(`name.ilike.%${term}%${digits ? `,phone.ilike.%${digits}%` : ""}`);
  const { data: customers } = await query;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">Customers</h1>
        <Link href="/customers/new" className="btn btn-primary">Add customer</Link>
      </div>
      <form className="mb-4">
        <label className="flex flex-col gap-1">Search
          <input name="q" type="search" defaultValue={q} placeholder="Name or number" />
        </label>
      </form>
      {!customers?.length && <p>No customers found.</p>}
      <ul className="divide-y">
        {customers?.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="flex justify-between py-3">
              <span>{c.name}</span>
              <span className="text-muted">{c.phone}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
