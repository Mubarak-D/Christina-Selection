import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { JobPhotos } from "@/components/JobPhotos";
import { SubmitButton } from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { signedUrls } from "@/lib/public-set";
import { formatDate } from "@/lib/dates";
import { FIELDS, SOURCES, SOURCE_LABEL, isDraft, isOpen, openMust, readBackMessage, revisionChanges, toCard, type Source } from "@/lib/jobcard";
import { buildReadBackLink } from "@/lib/whatsapp";
import { aiReady } from "@/lib/ai/jobcard";
import { addCustomerWords, answerQuestion, deleteJob, deletePhoto, fillWithAI, saveCaption, saveDetails } from "../actions";

const at = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase.from("job_cards")
    .select("*, customers(id,name,phone), job_card_media(id,path,caption,sort)").eq("id", id).maybeSingle();
  if (!job || !job.customers) notFound();

  const card = toCard(job);
  const must = openMust(card);
  const notConfirmed = new Set(must.map((q) => q.field));
  const open = [...must, ...card.questions.filter((q) => isOpen(q) && q.level === "check")];
  const answered = card.questions.filter((q) => !isOpen(q));
  const words = job.customer_words as { at: string; text: string }[];
  const photos = [...job.job_card_media].sort((a, b) => a.sort - b.sort);
  const urls = await signedUrls(photos.map((p) => p.path));
  const ai = aiReady();
  const was = revisionChanges(card);
  const readBack = job.customers.phone
    ? buildReadBackLink(job.customers.phone, readBackMessage(card, job.customers.name.split(/\s+/)[0])) : null;

  return (
    <>
      <BackLink href="/jobs" label="Job cards" />
      <p className="mb-1 text-sm text-muted">
        #{job.order_no} · {SOURCE_LABEL[job.source as Source]} · {job.due_date ? `Due ${formatDate(job.due_date)}` : "No due date"}
        {card.revision > 1 && ` · Revision ${card.revision}`}
        {job.printed_at && ` · Printed ${formatDate(job.printed_at)}`}
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{job.customers.name}{card.fields.item ? ` · ${card.fields.item}` : ""}</h1>
        <span className={`rounded-full px-3 py-1 text-xs ${isDraft(card) ? "border border-dashed border-danger text-danger" : "bg-gold/10 text-gold-ink"}`}>
          {isDraft(card) ? "Draft · not confirmed" : "Ready for the maker"}
        </span>
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link href={`/jobs/${job.id}/print`} className="btn btn-primary">Print</Link>
        {readBack ? (
          <a href={readBack} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Read back on WhatsApp</a>
        ) : (
          <p className="text-sm text-muted">Add a WhatsApp number to the customer to send a read-back.</p>
        )}
      </div>

      <section aria-label="Questions" className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Questions</h2>
          {ai ? (
            <form action={fillWithAI.bind(null, job.id)}>
              <SubmitButton className="btn btn-gold" pendingLabel="Reading the order…">Fill with AI</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">AI fill is off: add GEMINI_API_KEY to the server settings.</p>
          )}
        </div>
        {ai && <p className="mb-3 text-sm text-muted">AI fills blank details and asks questions. It never changes details you typed or answered. The chat and photos are sent to Google Gemini.</p>}
        {!open.length && !answered.length && <p className="text-muted">Nothing to confirm.</p>}
        <ul className="flex flex-col gap-3">
          {open.map((q) => (
            <li key={q.id} className="rounded-xl border border-line bg-pearl p-4">
              <form action={answerQuestion.bind(null, job.id, q.id)} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span><span className={q.level === "must" ? "text-danger" : "text-gold-ink"}>{q.level === "must" ? "Must answer" : "Check"}</span> · {q.text}</span>
                  <input name="answer" required placeholder={q.field ? `Answer fills ${FIELDS.find(([k]) => k === q.field)?.[1] ?? q.field}` : "Answer"} />
                </label>
                <SubmitButton className="btn btn-outline self-start" pendingLabel="Saving…">Save answer</SubmitButton>
              </form>
            </li>
          ))}
          {answered.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line px-4 py-3">
              <span className="min-w-0 flex-1"><span className="text-muted">{q.text}</span> → {q.answer}</span>
              <form action={answerQuestion.bind(null, job.id, q.id)}>
                <input type="hidden" name="answer" value="" />
                <SubmitButton className="min-h-11 text-sm text-danger" pendingLabel="Clearing…">Clear answer</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Details" className="mb-10">
        <h2 className="mb-3 text-xl">Details</h2>
        <form action={saveDetails.bind(null, job.id)} className="flex max-w-2xl flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">Due date
              <input type="date" name="due_date" defaultValue={job.due_date ?? ""} />
            </label>
            <label className="flex flex-col gap-1">Order came by
              <select name="source" defaultValue={job.source}>
                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </select>
            </label>
            {FIELDS.map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span>
                  {label}{notConfirmed.has(key) && <span className="text-danger"> ⚠ Not confirmed</span>}
                  {key in was && <> · was <s>{was[key] || "blank"}</s></>}
                </span>
                <input name={key} defaultValue={card.fields[key] ?? ""} />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1">Maker instructions (English, one per line)
            <textarea name="instructions_en" rows={4} defaultValue={(card.instructions_en ?? []).join("\n")} />
          </label>
          <label className="flex flex-col gap-1">Maker instructions (Sinhala, one per line)
            <textarea name="instructions_si" rows={4} lang="si" defaultValue={(card.instructions_si ?? []).join("\n")} />
          </label>
          <SubmitButton className="btn btn-primary self-start" pendingLabel="Saving…">Save details</SubmitButton>
        </form>
      </section>

      <section aria-label="Customer's words" className="mb-10">
        <h2 className="mb-3 text-xl">The customer&apos;s words</h2>
        {!words.length && <p className="mb-3 text-muted">None yet (walk-in or phone).</p>}
        <ul className="mb-4 flex flex-col gap-3">
          {words.map((w, i) => (
            <li key={i} className="rounded-xl border border-line bg-pearl p-4">
              <p className="mb-1 text-sm text-muted">{at(w.at)}</p>
              <p className="whitespace-pre-wrap">{w.text}</p>
            </li>
          ))}
        </ul>
        <form action={addCustomerWords.bind(null, job.id)} className="flex max-w-2xl flex-col gap-2">
          <label className="flex flex-col gap-1">Paste the customer&apos;s reply
            <textarea name="words" rows={3} required />
          </label>
          <SubmitButton className="btn btn-outline self-start" pendingLabel={ai ? "Adding and updating the card…" : "Adding…"}>
            {ai ? "Add reply and update card" : "Add reply"}
          </SubmitButton>
        </form>
      </section>

      <section aria-label="Photos" className="mb-10">
        <h2 className="mb-3 text-xl">Photos</h2>
        <ul className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="flex flex-col gap-2">
              <div className="aspect-square overflow-hidden rounded bg-line/40">
                {urls[p.path] && (
                  // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                  <img src={urls[p.path]} alt={p.caption ?? "Reference photo"} className="h-full w-full object-cover" />
                )}
              </div>
              <form action={saveCaption.bind(null, p.id)} className="flex flex-col gap-1">
                <input name="caption" aria-label="Caption" placeholder="Caption" defaultValue={p.caption ?? ""} />
                <SubmitButton className="min-h-11 self-start text-sm underline underline-offset-4" pendingLabel="Saving…">Save caption</SubmitButton>
              </form>
              <ConfirmButton action={deletePhoto.bind(null, p.id)} label="Remove" confirmLabel="Remove" className="min-h-11 self-start text-sm text-danger"
                title="Remove this photo?" message="It will be deleted from the job card." />
            </li>
          ))}
        </ul>
        <JobPhotos jobId={job.id} nextSort={photos.length} />
      </section>

      <div className="border-t border-line pt-6">
        <ConfirmButton action={deleteJob.bind(null, job.id)} label="Delete job card"
          title={`Delete job card #${job.order_no}?`} message="Its photos are deleted too. This can't be undone." />
      </div>
    </>
  );
}
