"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/database.types";
import { savePiece } from "../catalogue/actions";

export async function createSet(formData: FormData): Promise<{ id: string }> {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim() || null;
  const { data: set, error } = await supabase
    .from("selection_sets")
    .insert({ customer_id: String(formData.get("customer_id")), title })
    .select("id")
    .single();
  if (error) throw error;
  const pieces = formData.getAll("piece").map(String);
  if (pieces.length) {
    const items = await supabase.from("set_items").insert(pieces.map((piece_id) => ({ set_id: set.id, piece_id })));
    if (items.error) throw items.error;
  }
  return { id: set.id };
}

export async function createSetAndOpen(formData: FormData) {
  const { id } = await createSet(formData);
  redirect(`/sets/${id}`);
}

// One-off piece for this set only (not listed in the catalogue); photos upload right after.
export async function addOneOff(setId: string, formData: FormData): Promise<{ id: string }> {
  formData.set("in_catalogue", "false");
  const { id } = await savePiece(formData);
  const supabase = await createClient();
  const { error } = await supabase.from("set_items").insert({ set_id: setId, piece_id: id });
  if (error) throw error;
  revalidatePath(`/sets/${setId}`);
  return { id };
}

async function stamp(setId: string, fields: TablesUpdate<"selection_sets">, onlyIfNull?: "sent_at") {
  const supabase = await createClient();
  let q = supabase.from("selection_sets").update(fields).eq("id", setId);
  if (onlyIfNull) q = q.is(onlyIfNull, null);
  const { error } = await q;
  if (error) throw error;
}

export async function markSent(setId: string) {
  await stamp(setId, { sent_at: new Date().toISOString() }, "sent_at");
  revalidatePath(`/sets/${setId}`);
}

// Called while rendering the set page, so it must not revalidate.
export async function markSeen(setId: string) {
  const supabase = await createClient();
  await supabase.from("selection_sets").update({ seen_at: new Date().toISOString() })
    .eq("id", setId).not("submitted_at", "is", null).is("seen_at", null);
}

export async function markHandled(setId: string) {
  await stamp(setId, { handled_at: new Date().toISOString() });
  revalidatePath(`/sets/${setId}`);
}

export async function reopen(setId: string) {
  await stamp(setId, { handled_at: null });
  revalidatePath(`/sets/${setId}`);
}
