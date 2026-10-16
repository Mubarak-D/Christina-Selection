import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/sets/new", label: "New set" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects, but pages must not rely on it alone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b px-4 py-3">
        <nav className="flex flex-wrap gap-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <form action={signOut} className="ml-auto">
          <button>Sign out</button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
