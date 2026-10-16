"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tooBig, uploadMedia } from "@/lib/upload";

// On an existing piece: files upload as soon as they're chosen.
export function MediaUploader({ pieceId, nextSort = 0 }: { pieceId: string; nextSort?: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    if (tooBig(list)) {
      setError("Max 50 MB per file. Trim or compress the video and try again.");
      return;
    }
    try {
      for (const [i, file] of list.entries()) {
        setStatus(`Uploading ${i + 1} of ${list.length}…`);
        await uploadMedia(pieceId, file, nextSort + i);
      }
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        Add photos or videos
        <input type="file" accept="image/*,video/*" multiple disabled={!!status}
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-sm text-muted" aria-live="polite">{status ?? "Max 50 MB per file."}</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
