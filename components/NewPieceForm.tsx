"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PieceFields } from "./PieceForm";
import { iphoneVideoTip, tooBig, uploadMedia } from "@/lib/upload";
import { toast } from "./Toaster";

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
  const [tip, setTip] = useState<string | null>(null);

  // Free the preview URLs when files are removed or the form goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  const fileInput = useRef<HTMLInputElement>(null);
  // Files picked before hydration never fired onChange; take them once we're ready.
  useEffect(() => {
    const el = fileInput.current;
    if (el?.files?.length) {
      const files = el.files;
      queueMicrotask(() => { add(files); el.value = ""; });
    }
  }, []);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    if (tooBig(list)) {
      setError("Max 50 MB per file. Trim or compress the video and try again.");
      return;
    }
    setError(null);
    setTip((t) => iphoneVideoTip(list) ?? t);
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
    let failed = 0;
    for (const [i, c] of chosen.entries()) {
      setStatus(`Uploading ${i + 1} of ${chosen.length}…`);
      try {
        await uploadMedia(id, c.file, i);
      } catch {
        failed += 1;
      }
    }
    const done = chosen.length - failed;
    const what = inCatalogue ? "Piece saved" : "One-off piece added";
    toast(failed
      ? `${what}, but ${failed} of ${chosen.length} ${chosen.length === 1 ? "file" : "files"} didn't upload. Add ${failed === 1 ? "it" : "them"} again on the piece's page.`
      : `${what}${done ? ` with ${done} ${done === 1 ? "file" : "files"}` : ""}`);
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
      aria-label={name} className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <PieceFields inCatalogue={inCatalogue} />
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex flex-col gap-1">
          Add photos or videos
          <input ref={fileInput} name="files" type="file" className="w-full max-w-full text-sm" accept="image/*,video/*" multiple disabled={!!status}
            onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
        <p className="text-sm text-muted">Max 50 MB per file. They upload when you save.</p>
        {tip && <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-ink">{tip}</p>}
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
