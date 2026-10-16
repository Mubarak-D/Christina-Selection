"use client";

// Shown instead of a blank error page if a staff page or action fails (e.g. a dropped connection).
export default function StaffError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-pearl p-8 text-center">
      <h1 className="text-2xl">Something went wrong</h1>
      <p className="mt-2 text-muted">Check your connection and try again. Nothing you saved before this was lost.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">Try again</button>
    </div>
  );
}
