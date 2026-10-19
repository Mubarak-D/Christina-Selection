"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import { FIELDS, SOURCES, applyAnswer, flagSinhala, mergeFill, recordChange, toCard, type JobCard, type Source } from "@/lib/jobcard";
import { aiReady, fillJobCard } from "@/lib/ai/jobcard";
import { signedUrls } from "@/lib/public-set";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (fd: FormData, k: string) => text(fd, k).split("\n").map((l) => l.trim()).filter(Boolean);
const isSource = (s: string): s is Source => (SOURCES as readonly string[]).includes(s);

// ponytail: read-modify-write without a lock; two staff saving the same card at the same moment
// can lose one edit. Move to a DB function if that ever happens in practice.
async function update(id: string, change: (card: JobCard, row: Tables<"job_cards">) => object) {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("job_cards").select("*").eq("id", id).single();
  if (error) throw error;
  // Round-trip through JSON to drop undefined keys (e.g. a cleared answer) before saving as jsonb.
  const next = JSON.parse(JSON.stringify(change(toCard(row), row))) as TablesUpdate<"job_cards">;
  const { error: saveError } = await supabase.from("job_cards").update(next).eq("id", id);
  if (saveError) throw saveError;
  revalidatePath(`/jobs/${id}`);
}

export async function createJob(formData: FormData) {
  const source = text(formData, "source");
  if (!isSource(source)) throw new Error("Unknown source");
  const words = text(formData, "customer_words");
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_cards").insert({
    customer_id: text(formData, "customer_id"),
    source,
    due_date: text(formData, "due_date") || null,
    customer_words: words ? [{ at: new Date().toISOString(), text: words }] : [],
  }).select("id").single();
  if (error) throw error;
  await flash("Job card created");
  redirect(`/jobs/${data.id}`);
}

// Fields go through recordChange so edits after printing are tracked; untouched ones are skipped
// so they stay open to a later AI fill.
export async function saveDetails(id: string, formData: FormData) {
  const at = new Date().toISOString();
  await update(id, (card) => {
    let next = card;
    for (const [key] of FIELDS) {
      const value = text(formData, key);
      if (value !== (card.fields[key] ?? "")) next = recordChange(next, key, value, at);
    }
    const source = text(formData, "source");
    return {
      ...flagSinhala({ ...next, instructions_en: lines(formData, "instructions_en"), instructions_si: lines(formData, "instructions_si") }),
      due_date: text(formData, "due_date") || null,
      ...(isSource(source) ? { source } : {}),
    };
  });
  await flash("Saved");
}

export async function answerQuestion(id: string, questionId: string, formData: FormData) {
  // The Sinhala check can't be answered away: it comes back until the instructions match.
  await update(id, (card) => flagSinhala(applyAnswer(card, questionId, text(formData, "answer"), new Date().toISOString())));
}

// The customer's own words, appended as written. Nothing else ever writes this column.
// With AI on, the card is filled again so open questions reflect the reply.
export async function addCustomerWords(id: string, formData: FormData) {
  const words = text(formData, "words");
  if (!words) return;
  await update(id, (_card, row) => ({
    customer_words: [...(row.customer_words as Json[]), { at: new Date().toISOString(), text: words }],
  }));
  await flash(aiReady() ? await fill(id, "Reply added and card updated") : "Reply added");
}

export async function fillWithAI(id: string) {
  await flash(await fill(id, "Filled by AI. Check the questions."));
}

// Runs the AI fill and returns the message to show; failures come back as a message, not a crash.
async function fill(id: string, done: string): Promise<string> {
  if (!aiReady()) return "AI fill isn't set up (no GEMINI_API_KEY).";
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("job_cards").select("*, job_card_media(path,caption,sort)").eq("id", id).single();
  if (error) throw error;
  const media = [...row.job_card_media].sort((a, b) => a.sort - b.sort);
  const urls = await signedUrls(media.map((m) => m.path));
  try {
    const result = await fillJobCard({
      card: toCard(row),
      words: row.customer_words as { at: string; text: string }[],
      photos: media.filter((m) => urls[m.path]).map((m) => ({ url: urls[m.path], caption: m.caption })),
    });
    const at = new Date().toISOString();
    await update(id, (card) => flagSinhala(mergeFill(card, result, at)));
    return done;
  } catch (e) {
    return e instanceof Error ? e.message : "AI fill failed.";
  }
}

export async function addPhoto(id: string, path: string, sort: number) {
  if (!path.startsWith(`jobs/${id}/`)) throw new Error("Bad path");
  const supabase = await createClient();
  const { error } = await supabase.from("job_card_media").insert({ job_card_id: id, path, sort });
  if (error) throw error;
  revalidatePath(`/jobs/${id}`);
}

export async function saveCaption(mediaId: string, formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_card_media").update({ caption: text(formData, "caption") || null })
    .eq("id", mediaId).select("job_card_id").single();
  if (error) throw error;
  await flash("Caption saved");
  revalidatePath(`/jobs/${data.job_card_id}`);
}

export async function deletePhoto(mediaId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("job_card_media").select("path,job_card_id").eq("id", mediaId).single();
  if (!data) return;
  const files = await supabase.storage.from("media").remove([data.path]);
  if (files.error) throw files.error;
  const row = await supabase.from("job_card_media").delete().eq("id", mediaId);
  if (row.error) throw row.error;
  await flash("Photo removed");
  revalidatePath(`/jobs/${data.job_card_id}`);
}

export async function deleteJob(id: string) {
  const supabase = await createClient();
  const { data: card } = await supabase.from("job_cards").select("job_card_media(path)").eq("id", id).single();
  const paths = card?.job_card_media.map((m) => m.path) ?? [];
  if (paths.length) {
    const files = await supabase.storage.from("media").remove(paths); // first, so a failure can't orphan files
    if (files.error) throw files.error;
  }
  const { error } = await supabase.from("job_cards").delete().eq("id", id);
  if (error) throw error;
  await flash("Job card deleted");
  redirect("/jobs");
}

// Each print is stamped: edits after it start a new revision (see recordChange).
export async function markPrinted(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("job_cards").update({ printed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePath(`/jobs/${id}`);
}
