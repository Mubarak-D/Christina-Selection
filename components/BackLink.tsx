import Link from "next/link";
import { ChevronLeft } from "./Icons";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="eyebrow -ml-1 mb-4 inline-flex min-h-11 items-center gap-1.5 hover:text-ink">
      <ChevronLeft />
      {label}
    </Link>
  );
}
