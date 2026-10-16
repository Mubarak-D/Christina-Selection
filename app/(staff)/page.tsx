import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { Calendar, ChevronRight, Clock, Sparkle } from "@/components/Icons";
import { formatShortDate } from "@/lib/dates";

type Alert = Tables<"alerts">;

const SECTIONS = [
  { kind: "new_choice", title: "New choices", empty: "No new choices. They'll appear here as customers choose.", Icon: Sparkle },
  { kind: "no_reply", title: "No reply yet", empty: "Everyone has replied within 3 days.", Icon: Clock },
  { kind: "deadline", title: "Coming up", empty: "No deadlines in the next 7 days.", Icon: Calendar },
] as const;

const when = (a: Alert) => {
  if (!a.due) return "";
  const label = formatShortDate(a.due);
  return a.kind === "deadline" ? `${a.label} · ${label}` : `${a.label} · ${a.kind === "no_reply" ? "sent" : "chosen"} ${label}`;
};

// Greeting and date in Sri Lanka time, whatever the server's clock.
function today() {
  const now = new Date();
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Colombo" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" });
  return { greeting, date };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: alerts } = await supabase.from("alerts").select("*").order("due");
  const { greeting, date } = today();

  return (
    <>
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl">Dashboard</h1>
          <p className="mt-1 text-muted">{greeting}. {date}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/sets/new" className="btn btn-primary">New set</Link>
          <Link href="/catalogue/new" className="btn btn-outline">Add piece</Link>
          <Link href="/customers/new" className="btn btn-outline">Add customer</Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SECTIONS.map(({ kind, title, empty, Icon }) => {
          const rows = (alerts ?? []).filter((a) => a.kind === kind);
          return (
            <section key={kind} aria-label={title}
              className={`flex flex-col rounded-2xl border bg-pearl p-5 ${rows.length ? "border-gold/40" : "border-line"}`}>
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden className={`flex h-9 w-9 items-center justify-center rounded-full ${rows.length ? "bg-gold text-pearl" : "bg-line/60 text-muted"}`}>
                  <Icon />
                </span>
                <h2 className="flex-1 text-xl">{title}</h2>
                {rows.length > 0 && <span className="price rounded-full bg-gold/10 px-2.5 py-0.5 text-sm text-gold-ink">{rows.length}</span>}
              </div>
              {!rows.length && <p className="text-sm text-muted">{empty}</p>}
              <ul className="-mx-2 flex flex-col">
                {rows.map((a) => (
                  <li key={`${a.kind}-${a.set_id ?? a.customer_id}-${a.label}`}>
                    <Link href={a.set_id ? `/sets/${a.set_id}` : `/customers/${a.customer_id}`}
                      className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-ivory">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{a.customer_name}</span>
                        <span className={`block text-sm ${a.label === "Overdue" ? "text-danger" : "text-muted"}`}>{when(a)}</span>
                      </span>
                      <span className="text-muted transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5"><ChevronRight /></span>
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
