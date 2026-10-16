"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/sets/new", label: "New set" },
];

export function StaffNav({ newChoices }: { newChoices: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="flex gap-x-5 overflow-x-auto whitespace-nowrap pr-8 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:flex-wrap sm:gap-x-6 sm:pr-0 sm:[mask-image:none]">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
          aria-label={n.href === "/" && newChoices > 0 ? `Dashboard (${newChoices} new)` : undefined}
          className="eyebrow inline-flex min-h-11 items-center border-b border-transparent transition-colors hover:text-ink aria-[current=page]:border-gold aria-[current=page]:text-ink">
          {n.label}
          {n.href === "/" && newChoices > 0 && " "}
          {n.href === "/" && newChoices > 0 && (
            <span className="rounded-full bg-gold px-2 py-0.5 tracking-normal text-pearl">{newChoices}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
