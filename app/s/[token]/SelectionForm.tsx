"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicItem, PublicSet } from "@/lib/public-set";
import { formatPrice } from "@/lib/format";
import { Reveal } from "@/components/Reveal";
import { PreviewTile } from "@/components/MediaViewer";
import { submitSelection } from "./actions";

type View = "choose" | "thanks" | "locked";
const SWAP_MS = 180; // --dur-fast: exit before the next view enters

export function SelectionForm({ token, set }: { token: string; set: PublicSet }) {
  const [view, setView] = useState<View>(set.locked ? "locked" : set.submitted ? "thanks" : "choose");
  const [leaving, setLeaving] = useState(false);
  const [chosen, setChosen] = useState(
    () => new Set(set.items.filter((i) => i.status === "chosen").map((i) => i.pieceId)));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a view swap the pressed button is gone; move focus to the new view's heading.
  const heading = useRef<HTMLHeadingElement>(null);
  const swapped = useRef(false);
  useEffect(() => {
    if (swapped.current) heading.current?.focus();
  }, [view]);

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  function swap(next: View) {
    setLeaving(true);
    swapped.current = true;
    setTimeout(() => {
      setView(next);
      setLeaving(false);
      window.scrollTo({ top: 0 });
    }, SWAP_MS);
  }

  async function submit() {
    setSending(true);
    setError(null);
    const result = await submitSelection(token, [...chosen]).catch(() => "error" as const);
    setSending(false);
    if (result === "ok") swap("thanks");
    else if (result === "locked") swap("locked");
    else setError("Couldn't send. Please try again.");
  }

  // Signed media URLs last an hour; customers often reopen the WhatsApp tab later.
  // On the first broken photo/video, fetch fresh URLs (selection state is kept).
  const router = useRouter();
  const refreshed = useRef(false);
  // Bumped with the refresh so media remounts and refetches even if the new URL is identical
  // (URLs signed within the same second match).
  const [mediaRetry, setMediaRetry] = useState(0);
  const onMediaError = useCallback(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    router.refresh();
    setTimeout(() => setMediaRetry((n) => n + 1), 1500);
  }, [router]);
  // An image can fail before hydration attaches onError; catch those on mount.
  useEffect(() => {
    const broken = [...document.querySelectorAll<HTMLImageElement>("main img")]
      .some((img) => img.complete && img.naturalWidth === 0);
    if (broken) onMediaError();
  }, [onMediaError]);

  const picked = set.items.filter((i) => chosen.has(i.pieceId));

  return (
    <main className={`mx-auto w-full max-w-xl ${view === "choose" ? "pb-36" : "pb-16"} ${leaving ? "fade-out" : "rise-in"}`} key={view}>
      <p className="wordmark border-b border-line py-5 text-center">Christina Jewellers</p>
      <header className="px-6 pb-12 pt-14 text-center">
        <h1 ref={view === "thanks" ? undefined : heading} tabIndex={-1} className="display text-[2rem] leading-tight outline-none [text-wrap:balance]">{set.title || "Your selection"}</h1>
        {view === "choose" && (
          <p className="mt-4 text-muted">
            Hi {set.firstName}, choose the pieces you love. You can pick as many as you like.
          </p>
        )}
      </header>

      {view === "locked" && (
        <section className="px-6 text-center">
          <p className="text-lg">Your jeweller is preparing your selection.</p>
          <ChosenList items={picked} />
        </section>
      )}

      {view === "thanks" && (
        <section aria-label="Thank you" className="px-6 text-center">
          <h2 ref={heading} tabIndex={-1} className="display text-[1.75rem] outline-none">Thank you</h2>
          <span aria-hidden className="draw-line" />
          <p className="mt-3 text-muted">
            {picked.length ? "We've received your choice:" : "We've noted that none of these suit you."}
          </p>
          <ChosenList items={picked} />
          <p className="mt-8 text-muted">We&apos;ll be in touch on WhatsApp shortly.</p>
          <button onClick={() => swap("choose")} className="btn btn-outline mt-10">Change my choice</button>
        </section>
      )}

      {view === "choose" && (
        <>
          <ul className="flex flex-col gap-14">
            {set.items.map((item, i) => (
              <li key={item.pieceId}>
                <Reveal index={i}>
                  <PieceCard item={item} selected={chosen.has(item.pieceId)} onToggle={() => toggle(item.pieceId)} onMediaError={onMediaError} mediaKey={mediaRetry} />
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="slide-up fixed inset-x-0 bottom-0 border-t border-line bg-ivory/85 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md">
            <div className="mx-auto flex max-w-xl flex-col gap-2">
              {error && <p role="alert" className="text-center text-danger">{error}</p>}
              {chosen.size ? (
                <button onClick={submit} disabled={sending} className="btn btn-primary w-full">
                  {sending ? "Sending…" : `Submit my choice (${chosen.size})`}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted">Tap Choose on the pieces you like.</p>
                  <button onClick={submit} disabled={sending} className="btn btn-outline shrink-0">
                    {sending ? "Sending…" : "None of these"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function PieceCard({ item, selected, onToggle, onMediaError, mediaKey }: {
  item: PublicItem; selected: boolean; onToggle: () => void; onMediaError: () => void; mediaKey: number;
}) {
  const specs = [item.metal, item.karat, item.weightG != null ? `${item.weightG} g` : null, item.stones].filter(Boolean);
  return (
    <article>
      {!!item.media.length && (
        <div className="relative">
          <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {item.media.map((m, i) => (
              <div key={`${m.url}#${mediaKey}`} className="aspect-square w-full shrink-0 snap-center bg-line/40">
                <PreviewTile items={item.media} title={item.title} index={i} className="h-full">
                  {m.kind === "video" ? (
                    <video src={m.url} muted playsInline preload="metadata" onError={onMediaError} className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                    <img src={m.url} alt={i === 0 ? item.title : ""} loading={i === 0 ? "eager" : "lazy"} onError={onMediaError}
                      className="h-full w-full object-cover" />
                  )}
                </PreviewTile>
              </div>
            ))}
          </div>
          {/* Inset gold frame + badge: visible on all four sides even edge-to-edge. */}
          <div aria-hidden className={`pointer-events-none absolute inset-0 ring-4 ring-inset ring-gold transition-opacity duration-[var(--dur-fast)] ${selected ? "opacity-100" : "opacity-0"}`} />
          {selected && (
            <span aria-hidden className="pop pointer-events-none absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-pearl">
              <CheckIcon />
            </span>
          )}
        </div>
      )}
      {item.media.length > 1 && (
        <p className="px-6 pt-3 text-sm text-muted">Swipe to see all {item.media.length}</p>
      )}
      <div className="flex flex-col gap-2 px-6 pt-6">
        <h2 className="display text-[1.5rem] leading-snug [text-wrap:balance]">{item.title}</h2>
        <p className="price text-lg text-gold-ink">{formatPrice(item.price)}</p>
        {!!specs.length && (
          <ul aria-label="Details" className="eyebrow flex flex-wrap gap-x-5 gap-y-1">
            {specs.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
        {item.description && <p className="text-muted">{item.description}</p>}
        <button onClick={onToggle} aria-pressed={selected} aria-label={`Choose ${item.title}`}
          className={`btn mt-3 self-start ${selected ? "btn-gold pop" : "btn-outline"}`} key={String(selected)}>
          {selected && <CheckIcon />}
          {selected ? "Chosen" : "Choose"}
        </button>
      </div>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChosenList({ items }: { items: PublicItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="mx-auto mt-8 flex max-w-sm flex-col divide-y divide-line border-y border-line text-left">
      {items.map((i) => (
        <li key={i.pieceId} className="flex items-baseline justify-between gap-4 py-4">
          <span>{i.title}</span>
          <span className="price shrink-0 text-gold-ink">{formatPrice(i.price)}</span>
        </li>
      ))}
    </ul>
  );
}
