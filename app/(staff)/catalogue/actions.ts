"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";

const text = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (fd: FormData, k: string) => {
  const n = Number(text(fd, k) ?? NaN);
  return Number.isFinite(n) ? n : null; // blank or malformed → empty, not a failed save
};

// Inserts, or updates when the form carries an id. One-offs send in_catalogue=false.
export async function savePiece(formData: FormData): Promise<{ id: string }> {
  const row = {
    title: text(formData, "title") ?? "Untitled",
    price: num(formData, "price"),
    metal: text(formData, "metal"),
    karat: text(formData, "karat"),
    weight_g: num(formData, "weight_g"),
    stones: text(formData, "stones"),
    description: text(formData, "description"),
    in_catalogue: formData.get("in_catalogue") !== "false",
  };
  const supabase = await createClient();
  const id = text(formData, "id");
  const { data, error } = id
    ? await supabase.from("pieces").update(row).eq("id", id).select("id").single()
    : await supabase.from("pieces").insert(row).select("id").single();
  if (error) throw error;
  revalidatePath("/catalogue");
  return { id: data.id };
}

export async function deleteMedia(mediaId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("piece_media").select("path,piece_id").eq("id", mediaId).single();
  if (!data) return;
  await supabase.storage.from("media").remove([data.path]);
  await supabase.from("piece_media").delete().eq("id", mediaId);
  await flash("Removed");
  revalidatePath(`/catalogue/${data.piece_id}`);
}
