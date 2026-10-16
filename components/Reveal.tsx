"use client";

import { useEffect, useRef } from "react";

// Fades and lifts children in the first time they scroll into view (once).
// Server HTML is fully visible; only elements still below the fold after mount are hidden,
// so nothing flashes and nothing stays invisible without JS. CSS handles reduced motion.
export function Reveal({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "pending";
    el.style.transitionDelay = `${Math.min(index, 4) * 80}ms`;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      el.dataset.reveal = "in";
      io.disconnect();
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  return <div ref={ref}>{children}</div>;
}
