"use client";

import { useState } from "react";
import type { PublicItem, PublicSet } from "@/lib/public-set";
import { formatPrice } from "@/lib/format";
import { submitSelection } from "./actions";

type View = "choose" | "thanks" | "locked";

export function SelectionForm({ token, set }: { token: string; set: PublicSet }) {
  const [view, setView] = useState<View>(set.locked ? "locked" : set.submitted ? "thanks" : "choose");
  const [chosen, setChosen] = useState(
    () => new Set(set.items.filter((i) => i.status === "chosen").map((i) => i.pieceId)));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  async function submit() {
    setSending(true);
    setError(null);
    const result = await submitSelection(token, [...chosen]).catch(() => "error" as const);
    setSending(false);
    if (result === "ok") setView("thanks");
    else if (result === "locked") setView("locked");
    else setError("Couldn't send — please try again.");
  }

  const header = (
    <header className="px-4 pb-4 pt-10 text-center">
      <p className="text-sm uppercase tracking-widest opacity-70">Christina Jewellers</p>
      <h1 className="mt-2 text-3xl">{set.title || "Your selection"}</h1>
      <p className="mt-2 opacity-80">Hi {set.firstName}, tap the pieces you love.</p>
    </header>
  );

  if (view === "locked") {
    return (
      <main className="mx-auto max-w-xl pb-16">
        {header}
        <p className="px-4 text-center text-lg">Your jeweller is preparing your selection.</p>
        <ChosenList items={set.items.filter((i) => chosen.has(i.pieceId))} />
      </main>
    );
  }

  if (view === "thanks") {
    return (
      <main className="mx-auto max-w-xl pb-16">
        {header}
        <section aria-label="Thank you" className="px-4 text-center">
          <h2 className="text-2xl">Thank you</h2>
          <p className="mt-2 opacity-80">
            {chosen.size ? "We've received your choice:" : "We've noted that none of these suit you."}
          </p>
          <ChosenList items={set.items.filter((i) => chosen.has(i.pieceId))} />
          <button onClick={() => setView("choose")} className="mt-6 underline">Change my choice</button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl pb-32">
      {header}
      <ul className="flex flex-col gap-8 px-4">
        {set.items.map((item) => (
          <li key={item.pieceId}>
            <PieceCard item={item} selected={chosen.has(item.pieceId)} onToggle={() => toggle(item.pieceId)} />
          </li>
        ))}
      </ul>
      <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {error && <p role="alert" className="text-center text-red-700">{error}</p>}
          <button onClick={submit} disabled={sending} className="w-full rounded-full bg-black px-6 py-3 text-white disabled:opacity-50">
            {sending ? "Sending…" : chosen.size ? `Submit my choice (${chosen.size})` : "None of these"}
          </button>
        </div>
      </div>
    </main>
  );
}

function PieceCard({ item, selected, onToggle }: { item: PublicItem; selected: boolean; onToggle: () => void }) {
  const specs = [item.metal, item.karat, item.weightG != null ? `${item.weightG} g` : null, item.stones]
    .filter(Boolean);
  return (
    <article className={`overflow-hidden rounded-2xl border ${selected ? "ring-4 ring-amber-500" : ""}`}>
      {!!item.media.length && (
        <div className="flex snap-x snap-mandatory overflow-x-auto">
          {item.media.map((m) => (
            <div key={m.url} className="aspect-square w-full shrink-0 snap-center bg-neutral-100">
              {m.kind === "video" ? (
                <video src={m.url} controls playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                <img src={m.url} alt={item.title} className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-xl">{item.title}</h2>
        <p className="text-lg">{formatPrice(item.price)}</p>
        {!!specs.length && <p className="text-sm opacity-80">{specs.join(" · ")}</p>}
        {item.description && <p className="text-sm opacity-80">{item.description}</p>}
        <button onClick={onToggle} aria-pressed={selected} aria-label={`Choose ${item.title}`}
          className={`mt-2 rounded-full border px-4 py-3 ${selected ? "bg-amber-500 text-white" : ""}`}>
          {selected ? "Chosen ✓" : "Choose"}
        </button>
      </div>
    </article>
  );
}

function ChosenList({ items }: { items: PublicItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((i) => <li key={i.pieceId}>{i.title} — {formatPrice(i.price)}</li>)}
    </ul>
  );
}
