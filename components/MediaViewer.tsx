"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { motionTokens } from "@/lib/motion-tokens";

export type ViewerItem = { kind: "image" | "video"; url: string };

const icon = (d: string) => (
  <svg aria-hidden viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Full-screen preview of one piece's photos and videos. Native <dialog>: Esc, focus trap
// and screen-reader semantics come with it. Swipe (scroll-snap) or arrows between items.
function MediaViewer({ items, title, start, onClose }: {
  items: ViewerItem[]; title: string; start: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    dialog.current?.showModal();
    const slide = track.current?.children[start] as HTMLElement | undefined;
    if (slide && track.current) track.current.scrollLeft = slide.offsetLeft;
  }, [start]);

  const step = (dir: 1 | -1) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth, behavior: reduce ? "auto" : "smooth" });

  return (
    <dialog ref={dialog} aria-label={title} onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
      onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-pearl backdrop:bg-ink">
      <motion.div className="relative h-full w-full"
        initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.15 : motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
        <div ref={track} className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
          {items.map((m, i) => (
            <div key={m.url} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4 sm:p-12"
              onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
              {m.kind === "video" ? (
                <video src={m.url} controls playsInline autoPlay={i === start} className="max-h-full max-w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; skip the image optimizer
                <img src={m.url} alt={`${title}, ${i + 1} of ${items.length}`} className="max-h-full max-w-full object-contain" />
              )}
            </div>
          ))}
        </div>
        <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} autoFocus
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink/60 backdrop-blur">
          {icon("M5 5l10 10M15 5L5 15")}
        </button>
        {items.length > 1 && (
          <>
            <button type="button" aria-label="Previous" onClick={() => step(-1)}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 backdrop-blur sm:flex">
              {icon("M12 4l-6 6 6 6")}
            </button>
            <button type="button" aria-label="Next" onClick={() => step(1)}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 backdrop-blur sm:flex">
              {icon("M8 4l6 6-6 6")}
            </button>
          </>
        )}
      </motion.div>
    </dialog>
  );
}

// A tappable thumbnail that opens the viewer at its own item. Children are the thumbnail.
export function PreviewTile({ items, title, index, className = "", children }: {
  items: ViewerItem[]; title: string; index: number; className?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isVideo = items[index]?.kind === "video";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`View ${title} full screen`}
        className={`relative block w-full cursor-zoom-in ${className}`}>
        {children}
        {isVideo && (
          <span aria-hidden className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/55 text-pearl backdrop-blur">
            <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor"><path d="M7 4.5v11l9-5.5z" /></svg>
          </span>
        )}
      </button>
      {open && <MediaViewer items={items} title={title} start={index} onClose={() => setOpen(false)} />}
    </>
  );
}
