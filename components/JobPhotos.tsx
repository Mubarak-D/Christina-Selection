"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { mediaPath } from "@/lib/media";
import { tooBig } from "@/lib/upload";
import { addPhoto } from "@/app/(staff)/jobs/actions";
import { toast } from "./Toaster";

// Reference photos for a job card: upload straight to the private bucket under jobs/<id>/.
export function JobPhotos({ jobId, nextSort }: { jobId: string; nextSort: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError(null);
    if (tooBig(list)) return setError("Max 50 MB per photo.");
    const supabase = createBrowserClient();
    try {
      for (const [i, file] of list.entries()) {
        setStatus(`Uploading ${i + 1} of ${list.length}…`);
        const path = mediaPath(`jobs/${jobId}`, file.name);
        const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        await addPhoto(jobId, path, nextSort + i);
      }
      toast(list.length === 1 ? "Photo added" : `${list.length} photos added`);
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
        Add photos
        <input type="file" accept="image/*" multiple disabled={!!status} className="w-full max-w-full text-sm"
          onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-sm text-muted" aria-live="polite">{status ?? "Add a caption to each photo below."}</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
