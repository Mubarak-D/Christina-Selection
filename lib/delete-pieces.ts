import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Deletes pieces and their stored photos/videos (rows cascade; storage files don't).
export async function deletePieces(supabase: SupabaseClient<Database>, ids: string[]) {
  if (!ids.length) return;
  const { data: media } = await supabase.from("piece_media").select("path").in("piece_id", ids);
  const paths = (media ?? []).map((m) => m.path);
  if (paths.length) {
    const { error } = await supabase.storage.from("media").remove(paths);
    if (error) throw error;
  }
  const { error } = await supabase.from("pieces").delete().in("id", ids);
  if (error) throw error;
}

// One-off pieces in these sets: they were made only for that set, so they go with it.
export async function oneOffPiecesIn(supabase: SupabaseClient<Database>, setIds: string[]) {
  if (!setIds.length) return [];
  const { data } = await supabase.from("set_items").select("piece_id, pieces(in_catalogue)").in("set_id", setIds);
  return (data ?? []).filter((i) => i.pieces && !i.pieces.in_catalogue).map((i) => i.piece_id);
}
