"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// Submit button for the slow AI actions (10-40 s on the free tier): while working it counts the
// seconds and carries a slow gold sheen, so a long wait reads as progress, not a frozen page.
export function AiSubmitButton({ children, pendingLabel, className }: {
  children: React.ReactNode; pendingLabel: string; className: string;
}) {
  const { pending } = useFormStatus();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => { clearInterval(t); setSeconds(0); };
  }, [pending]);
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} ${pending ? "working" : ""}`}>
      {pending ? <>{pendingLabel} <span className="tabular-nums">{seconds} s</span></> : children}
    </button>
  );
}
