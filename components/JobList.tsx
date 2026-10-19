import Link from "next/link";
import type { Tables } from "@/lib/database.types";
import { ChevronRight } from "./Icons";
import { formatDate } from "@/lib/dates";
import { SOURCE_LABEL, isDraft, isOpen, openMust, toCard, type Source } from "@/lib/jobcard";

type Row = Tables<"job_cards"> & { customers?: { name: string } | null };

export function JobList({ jobs, showCustomer = false }: { jobs: Row[]; showCustomer?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((j) => {
        const card = toCard(j);
        const draft = isDraft(card);
        const open = card.questions.filter((q) => isOpen(q) && q.level === "check").length + openMust(card).length;
        return (
          <li key={j.id}>
            <Link href={`/jobs/${j.id}`} className="flex items-center gap-4 rounded-xl border border-line bg-pearl px-4 py-3 hover:border-gold">
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  #{j.order_no} · {card.fields.item || "Untitled"}{showCustomer && j.customers ? ` · ${j.customers.name}` : ""}
                </span>
                <span className="block text-sm text-muted">
                  {j.due_date ? `Due ${formatDate(j.due_date)}` : "No due date"} · {SOURCE_LABEL[j.source as Source]}
                  {open > 0 && ` · ${open} open ${open === 1 ? "question" : "questions"}`}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${draft ? "border border-dashed border-line text-muted" : "bg-gold/10 text-gold-ink"}`}>
                {draft ? "Draft" : "Ready"}
              </span>
              <span className="text-muted"><ChevronRight /></span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
