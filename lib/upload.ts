import { createBrowserClient } from "@/lib/supabase/client";
import { mediaPath } from "@/lib/media";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // Supabase free-plan per-file limit
export const tooBig = (files: File[]) => files.some((f) => f.size > MAX_UPLOAD_BYTES);

// Browser upload straight to the private "media" bucket, then record the file on the piece.
export async function uploadMedia(pieceId: string, file: File, sort: number) {
  const supabase = createBrowserClient();
  const path = mediaPath(pieceId, file.name);
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const kind = file.type.startsWith("video/") ? "video" : "image";
  const row = await supabase.from("piece_media").insert({ piece_id: pieceId, path, kind, sort });
  if (row.error) throw row.error;
}
