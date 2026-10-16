"use client";

import { useRef } from "react";
import { SubmitButton } from "./SubmitButton";
import { formatPrice } from "@/lib/format";

type Item = { pieceId: string; title: string; price: number | null; chosen: boolean };

// Mark handled, asking what the customer actually bought (their chosen pieces pre-ticked).
export function HandledDialog({ action, items }: { action: (fd: FormData) => void | Promise<void>; items: Item[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => dialog.current?.showModal()}>Mark handled</button>
      <dialog ref={dialog} aria-label="What did they buy?"
        onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-pearl p-0 text-ink shadow-[0_20px_60px_rgba(28,25,23,.25)] backdrop:bg-ink/40">
        <form action={action} className="p-6">
          <h2 className="text-xl">What did they buy?</h2>
          <p className="mt-1 text-sm text-muted">Ticked pieces are saved to the customer&apos;s purchases. Untick all if nothing was bought.</p>
          <ul className="my-5 flex flex-col divide-y divide-line border-y border-line">
            {items.map((i) => (
              <li key={i.pieceId}>
                <label className="flex cursor-pointer items-center gap-3 py-3 text-ink">
                  <input type="checkbox" name="sold" value={i.pieceId} defaultChecked={i.chosen} />
                  <span className="flex-1">{i.title}</span>
                  <span className="price text-sm text-muted">{formatPrice(i.price)}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-outline" onClick={() => dialog.current?.close()}>Cancel</button>
            <SubmitButton pendingLabel="Saving…">Mark handled</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
