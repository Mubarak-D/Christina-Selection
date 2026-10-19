import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { PrintButton } from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { formatDate } from "@/lib/dates";
import { FIELDS, SOURCE_LABEL, isOpen, openMust, revisionChanges, toCard, type Source } from "@/lib/jobcard";
import { markPrinted } from "../../actions";

type Props = { params: Promise<{ id: string }> };

const load = async (id: string) => (await createClient()).from("job_cards")
  .select("*, customers(name), job_card_media(path,caption,sort)").eq("id", id).maybeSingle();

// The browser offers the page title as the PDF name: YYYY-MM-DD_Customer-Name (Sri Lanka date).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: job } = await load((await params).id);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  return { title: { absolute: `${today}_${(job?.customers?.name ?? "Job").trim().replace(/\s+/g, "-")}` } };
}

export default async function PrintJobPage({ params }: Props) {
  const { id } = await params;
  const { data: job } = await load(id);
  if (!job || !job.customers) notFound();

  const card = toCard(job);
  const must = openMust(card);
  const checks = card.questions.filter((q) => isOpen(q) && q.level === "check");
  const was = revisionChanges(card);
  const words = job.customer_words as { at: string; text: string }[];
  const photos = [...job.job_card_media].sort((a, b) => a.sort - b.sort);
  const urls = await signedUrls(photos.map((p) => p.path));

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <BackLink href={`/jobs/${job.id}`} label="Back to card" />
        <PrintButton markPrinted={markPrinted.bind(null, job.id)} />
      </div>

      <article className="mx-auto max-w-[190mm] bg-pearl p-6 text-[10.5pt] leading-snug text-ink print:bg-transparent print:p-0">
        {must.length > 0 && (
          <div className="mb-4 border-2 border-danger p-3 text-danger">
            <p className="text-lg font-semibold tracking-wide">DRAFT – NOT CONFIRMED</p>
            <ul className="mt-1 list-disc pl-5">{must.map((q) => <li key={q.id}>{q.text}</li>)}</ul>
          </div>
        )}

        <header className="mb-4 flex items-start justify-between gap-4 border-b border-ink pb-2">
          <div>
            <p className="display text-xl">Christina Jewellers · Job card</p>
            <p>{job.customers.name} · {SOURCE_LABEL[job.source as Source]} · Taken {formatDate(job.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">#{job.order_no}</p>
            <p className="font-semibold">{job.due_date ? `Due ${formatDate(job.due_date)}` : "No due date"}</p>
            {card.revision > 1 && <p className="mt-1 border border-ink px-2 font-semibold">REVISION {card.revision}</p>}
          </div>
        </header>

        <table className="mb-4 w-full border-collapse">
          <tbody>
            {FIELDS.filter(([k]) => card.fields[k] || k in was).map(([k, label]) => (
              <tr key={k} className="border-b border-line">
                <th scope="row" className="w-32 py-1 pr-3 text-left align-top font-normal text-muted">{label}</th>
                <td className="py-1 font-semibold">
                  {k in was && <s className="mr-2 font-normal text-muted">{was[k] || "(blank)"}</s>}
                  {card.fields[k] || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(card.instructions_en?.length || card.instructions_si?.length) ? (
          <section className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <h2 className="mb-1 font-semibold">Instructions</h2>
              <ol className="list-decimal pl-5">{card.instructions_en?.map((l, i) => <li key={i}>{l}</li>)}</ol>
            </div>
            <div lang="si">
              <h2 className="mb-1 font-semibold">උපදෙස්</h2>
              <ol className="list-decimal pl-5">{card.instructions_si?.map((l, i) => <li key={i}>{l}</li>)}</ol>
            </div>
          </section>
        ) : null}

        {checks.length > 0 && (
          <section className="mb-4">
            <h2 className="mb-1 font-semibold">Still to check</h2>
            <ul className="list-disc pl-5">{checks.map((q) => <li key={q.id}>{q.text}</li>)}</ul>
          </section>
        )}

        {photos.length > 0 && (
          <section className="mb-4 grid grid-cols-3 gap-3">
            {photos.map((p) => urls[p.path] && (
              <figure key={p.path} className="break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer */}
                <img src={urls[p.path]} alt={p.caption ?? "Reference photo"} className="h-[45mm] w-full rounded object-cover" />
                {p.caption && <figcaption className="mt-1 text-[9pt]">{p.caption}</figcaption>}
              </figure>
            ))}
          </section>
        )}

        {words.length > 0 && (
          <section className="text-[9pt] text-muted">
            <h2 className="mb-1 font-semibold text-ink">Customer&apos;s words</h2>
            {words.map((w, i) => <p key={i} className="mb-1 whitespace-pre-wrap">{w.text}</p>)}
          </section>
        )}
      </article>
    </>
  );
}
