"use client";

import { useRef } from "react";
import { SubmitButton } from "./SubmitButton";

// A destructive action behind a native confirmation dialog (focus trap and Esc built in).
export function ConfirmButton({
  action, label, title, message, confirmLabel = "Delete", ariaLabel, className = "btn btn-outline border-danger text-danger",
}: {
  action: (fd: FormData) => void | Promise<void>;
  label: string; title: string; message: string; confirmLabel?: string; ariaLabel?: string; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" aria-label={ariaLabel} className={className} onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog ref={dialog} aria-label={title}
        onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-pearl p-0 text-ink shadow-[0_20px_60px_rgba(28,25,23,.25)] backdrop:bg-ink/40">
        <div className="p-6">
          <h2 className="text-xl">{title}</h2>
          <p className="mt-2 text-muted">{message}</p>
          <form action={action} className="mt-6 flex justify-end gap-3">
            <button type="button" autoFocus className="btn btn-outline" onClick={() => dialog.current?.close()}>Cancel</button>
            <SubmitButton className="btn border border-danger bg-danger text-pearl" pendingLabel="Working…">{confirmLabel}</SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
