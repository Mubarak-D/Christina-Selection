"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { motionTokens } from "@/lib/motion-tokens";

type Tone = "ok" | "error";
type Toast = { id: number; message: string; tone?: Tone };
const listeners = new Set<(t: Toast) => void>();

// Client code calls toast("Piece saved"); server actions call flash() instead.
// Errors get a "!" in danger red instead of the gold check, so a failure never reads as success.
export function toast(message: string, tone: Tone = "ok") {
  const t = { id: Date.now() + Math.random(), message, tone };
  listeners.forEach((l) => l(t));
}

function readFlash(): Toast | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith("flash="))?.slice(6);
  if (!raw) return null;
  document.cookie = "flash=; path=/; max-age=0";
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export function Toaster({ flashKey }: { flashKey?: string }) {
  const [current, setCurrent] = useState<Toast | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const show = (t: Toast) => setCurrent(t);
    listeners.add(show);
    return () => { listeners.delete(show); };
  }, []);

  // Server-action flashes arrive with a re-render (flashKey changes); pick them up from the cookie.
  useEffect(() => {
    const t = readFlash();
    if (t) toast(t.message, t.tone);
  }, [flashKey]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), current.message.length > 60 ? 7000 : 3200);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {current && (
          <motion.div key={current.id}
            initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8, transition: { duration: motionTokens.duration.fast } }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm text-pearl shadow-[0_10px_30px_rgba(28,25,23,.25)]">
            <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${current.tone === "error" ? "bg-danger" : "bg-gold"}`}>
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={current.tone === "error" ? "M10 5v6M10 14.5v.5" : "M4 10.5l4 4 8-9"} />
              </svg>
            </span>
            {current.tone === "error" && <span className="sr-only">Problem:</span>}
            {current.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
