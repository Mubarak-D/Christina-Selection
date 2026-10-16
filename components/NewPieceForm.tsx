"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PieceFields } from "./PieceForm";
import { tooBig, uploadMedia } from "@/lib/upload";

type Chosen = { file: File; url: string };

// New piece (catalogue or one-off): pick photos/videos first, then one Save does both.
export function NewPieceForm({
  save, destination, inCatalogue = true, submitLabel = "Save piece", name,
}: {
  save: (fd: FormData) => Promise<{ id: string }>;
  destination: string; // ":id" is replaced with the new piece's id
  inCatalogue?: boolean; submitLabel?: string; name?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Free the preview URLs when files are removed or the form goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    if (tooBig(list)) {
      setError("Max 50 MB per file. Trim or compress the video and try again.");
      return;
    }
    setError(null);
    const next = list.map((file) => ({ file, url: URL.createObjectURL(file) }));
    urls.current.push(...next.map((c) => c.url));
    setChosen((prev) => [...prev, ...next]);
  }

  function remove(url: string) {
    URL.revokeObjectURL(url);
    setChosen((prev) => prev.filter((c) => c.url !== url));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    let id: string;
    try {
      setStatus("Saving…");
      ({ id } = await save(fd));
    } catch {
      setStatus(null);
      setError("Couldn't save. Please try again.");
      return;
    }
    try {
      for (const [i, c] of chosen.entries()) {
        setStatus(`Uploading ${i + 1} of ${chosen.length}…`);
        await uploadMedia(id, c.file, i);
      }
    } catch {
      setError("The piece was saved, but an upload failed. Add the rest on the piece's page.");
    }
    const to = destination.replace(":id", id);
    if (to === pathname) {
      form.current?.reset();
      chosen.forEach((c) => URL.revokeObjectURL(c.url));
      setChosen([]);
      setStatus(null);
      router.refresh();
    } else {
      router.push(to);
    }
  }

  return (
    // action={save}: if submitted before JavaScript loads, the details still save (without files).
    <form ref={form} action={save as unknown as (fd: FormData) => Promise<void>} onSubmit={submit}
      aria-label={name} className="grid gap-4 sm:grid-cols-2">
      <PieceFields inCatalogue={inCatalogue} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex flex-col gap-1">
          Add photos or videos
          <input name="files" type="file" accept="image/*,video/*" multiple disabled={!!status}
            onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
        <p className="text-sm text-muted">Max 50 MB per file. They upload when you save.</p>
        {!!chosen.length && (
          <ul aria-label="Chosen files" className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {chosen.map((c) => (
              <li key={c.url} className="relative">
                {c.file.type.startsWith("video/") ? (
                  <video src={c.url} muted playsInline className="aspect-square w-full rounded bg-ink object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of a chosen file
                  <img src={c.url} alt={c.file.name} className="aspect-square w-full rounded object-cover" />
                )}
                <button type="button" onClick={() => remove(c.url)} disabled={!!status}
                  aria-label={`Remove ${c.file.name}`}
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ivory/90 text-ink">
                  <svg aria-hidden viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p role="alert" className="text-danger sm:col-span-2">{error}</p>}
      <button type="submit" disabled={!!status} aria-busy={!!status} className="btn btn-primary sm:col-span-2">
        {status ?? submitLabel}
      </button>
    </form>
  );
}
