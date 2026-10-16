import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { phoneSearchDigits } from "@/lib/phone";
import { Chat, ChevronRight, Mail } from "@/components/Icons";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  // Strip characters that have meaning in PostgREST filter syntax.
  const term = q.replace(/[,()%*\\]/g, "").trim();
  const supabase = await createClient();
  let query = supabase.from("customers").select("id,name,phone,email,deadline").order("name").limit(100);
  const digits = phoneSearchDigits(term);
  if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%${digits ? `,phone.ilike.%${digits}%` : ""}`);
  const { data: customers } = await query;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl">Customers</h1>
        <Link href="/customers/new" className="btn btn-primary">Add customer</Link>
      </div>
      <form className="mb-6">
        <label className="flex flex-col gap-1">Search
          <input name="q" type="search" defaultValue={q} placeholder="Name, number or email" />
        </label>
      </form>
      {!customers?.length && (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-muted">
          {term ? "No customers match that search." : "No customers yet. Add your first one."}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {customers?.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`}
              className="group flex items-center gap-4 rounded-xl border border-line bg-pearl px-4 py-3 transition-[border-color,box-shadow] duration-[var(--dur-fast)] hover:border-gold hover:shadow-[0_6px_20px_rgba(28,25,23,.06)]">
              <span aria-hidden className="display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold-ink">
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.name}</span>
                <span className="flex flex-wrap gap-x-4 text-sm text-muted">
                  {c.phone && <span className="inline-flex items-center gap-1.5"><Chat />{c.phone}</span>}
                  {c.email && <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><Mail />{c.email}</span>}
                </span>
              </span>
              {c.deadline && (
                <span className="hidden shrink-0 rounded-full bg-gold/10 px-3 py-1 text-xs text-gold-ink sm:inline">
                  Needed by {shortDate(c.deadline)}
                </span>
              )}
              <span className="text-muted transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"><ChevronRight /></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
