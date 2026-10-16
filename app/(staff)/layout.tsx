import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { StaffNav } from "@/components/StaffNav";
import { SubmitButton } from "@/components/SubmitButton";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects, but pages must not rely on it alone.
  const supabase = await createClient();
  // Local JWT verification; data access is still enforced by RLS (staff list) on every query.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { count: newChoices } = await supabase
    .from("alerts").select("*", { count: "exact", head: true }).eq("kind", "new_choice");

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-pearl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-10 gap-y-2 px-4 py-4">
          <p className="display text-lg">Christina Jewellers</p>
          <StaffNav newChoices={newChoices ?? 0} />
          <form action={signOut} className="ml-auto">
            <SubmitButton className="eyebrow min-h-11 hover:text-ink" pendingLabel="Signing out…">Sign out</SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
