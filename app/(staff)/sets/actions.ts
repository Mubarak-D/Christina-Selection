"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import type { TablesUpdate } from "@/lib/database.types";
import { savePiece } from "../catalogue/actions";
import { deletePieces, oneOffPiecesIn } from "@/lib/delete-pieces";

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
  await flash("Set created");
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
  await flash("Marked handled");
  revalidatePath(`/sets/${setId}`);
}

export async function reopen(setId: string) {
  await stamp(setId, { handled_at: null });
  await flash("Set reopened");
  revalidatePath(`/sets/${setId}`);
}

// Deletes the set and its one-off pieces; catalogue pieces stay in the catalogue.
export async function deleteSet(setId: string) {
  const supabase = await createClient();
  const { data: set } = await supabase.from("selection_sets").select("customer_id").eq("id", setId).single();
  const oneOffs = await oneOffPiecesIn(supabase, [setId]);
  const { error } = await supabase.from("selection_sets").delete().eq("id", setId);
  if (error) throw error;
  await deletePieces(supabase, oneOffs);
  await flash("Set deleted");
  redirect(set ? `/customers/${set.customer_id}` : "/");
}

// Takes a piece out of the set; a one-off piece has nowhere else to live, so it's deleted.
export async function removeFromSet(setId: string, pieceId: string) {
  const supabase = await createClient();
  const oneOff = (await oneOffPiecesIn(supabase, [setId])).includes(pieceId);
  const { error } = await supabase.from("set_items").delete().eq("set_id", setId).eq("piece_id", pieceId);
  if (error) throw error;
  if (oneOff) await deletePieces(supabase, [pieceId]);
  revalidatePath(`/sets/${setId}`);
  await flash("Removed from set");
}
