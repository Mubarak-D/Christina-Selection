"use client";

import { useFormStatus } from "react-dom";

// A form's submit button that says what it's doing and can't be pressed twice.
export function SubmitButton({
  children, pendingLabel, className = "btn btn-primary",
}: { children: React.ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
