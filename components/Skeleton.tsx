// Shared loading placeholders. Each screen announces itself once to screen readers.
export function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

export const Bar = ({ className = "" }: { className?: string }) => <div className={`skeleton h-4 ${className}`} />;

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-2">
          <div className="skeleton aspect-square w-full" />
          <Bar className="w-3/4" />
          <Bar className="h-3 w-1/3" />
        </li>
      ))}
    </ul>
  );
}
