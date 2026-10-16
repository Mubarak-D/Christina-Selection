"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { iphoneVideoTip, tooBig, uploadMedia } from "@/lib/upload";
import { toast } from "./Toaster";

// On an existing piece: files upload as soon as they're chosen.
export function MediaUploader({ pieceId, nextSort = 0 }: { pieceId: string; nextSort?: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    setTip(iphoneVideoTip(list));
    if (tooBig(list)) {
      setError("Max 50 MB per file. Trim or compress the video and try again.");
      return;
    }
    try {
      for (const [i, file] of list.entries()) {
        setStatus(`Uploading ${i + 1} of ${list.length}…`);
        await uploadMedia(pieceId, file, nextSort + i);
      }
      toast(list.length === 1 ? "Uploaded" : `${list.length} files uploaded`);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setStatus(null);
    }
  }

  // Files picked before hydration never fired onChange; handle them once we're ready.
  useEffect(() => {
    const el = input.current;
    if (el?.files?.length) {
      const files = el.files;
      queueMicrotask(() => { upload(files); el.value = ""; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        Add photos or videos
        <input ref={input} type="file" className="w-full max-w-full text-sm" accept="image/*,video/*" multiple disabled={!!status}
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-sm text-muted" aria-live="polite">{status ?? "Max 50 MB per file."}</p>
      {tip && <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-ink">{tip}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
