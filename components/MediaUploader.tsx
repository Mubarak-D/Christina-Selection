"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024; // Supabase free-plan per-file limit

// Uploads straight from the browser to the private "media" bucket, then records the file.
export function MediaUploader({ pieceId, nextSort = 0 }: { pieceId: string; nextSort?: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    if (list.some((f) => f.size > MAX_BYTES)) {
      setError("Max 50 MB per file. Trim or compress the video and try again.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserClient();
    try {
      for (const [i, file] of list.entries()) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${pieceId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const kind = file.type.startsWith("video/") ? "video" : "image";
        const row = await supabase.from("piece_media").insert({ piece_id: pieceId, path, kind, sort: nextSort + i });
        if (row.error) throw row.error;
      }
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        Add photos or videos
        <input type="file" accept="image/*,video/*" multiple disabled={busy}
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-sm opacity-70">Max 50 MB per file.{busy && " Uploading…"}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
  );
}
