import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

type Alert = Tables<"alerts">;

const SECTIONS = [
  { kind: "new_choice", title: "New choices", empty: "No new choices." },
  { kind: "no_reply", title: "No reply yet", empty: "Everyone has replied within 3 days." },
  { kind: "upcoming_date", title: "Coming up", empty: "No birthdays or anniversaries in the next 7 days." },
] as const;

const when = (a: Alert) => {
  if (!a.due) return "";
  const d = new Date(`${a.due}T00:00:00Z`);
  const label = d.toLocaleDateString("en-LK", { day: "numeric", month: "short", timeZone: "UTC" });
  return a.kind === "upcoming_date" ? `${a.label} · ${label}` : `${a.label} · ${a.kind === "no_reply" ? "sent" : "chosen"} ${label}`;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: alerts } = await supabase.from("alerts").select("*").order("due");

  return (
    <>
      <h1 className="mb-6 text-2xl">Dashboard</h1>
      <div className="grid gap-8 md:grid-cols-3">
        {SECTIONS.map((s) => {
          const rows = (alerts ?? []).filter((a) => a.kind === s.kind);
          return (
            <section key={s.kind} aria-label={s.title}>
              <h2 className="mb-2 text-lg">{s.title} {rows.length > 0 && <span className="opacity-60">({rows.length})</span>}</h2>
              {!rows.length && <p className="text-sm opacity-60">{s.empty}</p>}
              <ul className="divide-y">
                {rows.map((a) => (
                  <li key={`${a.kind}-${a.set_id ?? a.customer_id}-${a.label}`}>
                    <Link href={a.set_id ? `/sets/${a.set_id}` : `/customers/${a.customer_id}`} className="block py-2">
                      <span className="block">{a.customer_name}</span>
                      <span className="block text-sm opacity-70">{when(a)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
