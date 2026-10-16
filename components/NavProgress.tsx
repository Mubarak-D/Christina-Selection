"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motionTokens } from "@/lib/motion-tokens";

// Gold hairline across the top while a page loads. Starts on internal link clicks and
// back/forward, finishes when the URL actually changes (App Router has no router events).
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const url = `${pathname}?${search}`;
  // The URL we were on when loading started; loading ends as soon as the URL differs.
  const [startedOn, setStartedOn] = useState<string | null>(null);
  const loading = startedOn === url;
  const current = useRef(url);
  useEffect(() => {
    current.current = url;
  }, [url]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin) return;
      if (to.pathname === location.pathname && to.search === location.search) return;
      setStartedOn(current.current);
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!e.defaultPrevented && form.method.toLowerCase() === "get") setStartedOn(current.current);
    };
    const onPop = () => setStartedOn(current.current);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Never leave the bar stuck (e.g. a redirect back to the same URL).
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setStartedOn(null), 15_000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="nav-progress"
          role="progressbar"
          aria-label="Loading page"
          className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gold"
          initial={{ scaleX: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
          // Trickles toward 85% (we don't know how long the server will take), then completes on exit.
          animate={{ scaleX: reduce ? 1 : 0.85, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth } }}
          transition={reduce ? { duration: 0.15 } : { duration: 8, ease: [0.1, 0.7, 0.3, 1] }}
        />
      )}
    </AnimatePresence>
  );
}
