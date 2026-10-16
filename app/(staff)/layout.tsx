import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { StaffNav } from "@/components/StaffNav";
import { SubmitButton } from "@/components/SubmitButton";
import { Toaster } from "@/components/Toaster";

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
        {/* Phone: wordmark + sign out on one row, the menu as one swipeable row below. */}
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto] items-center px-4 pt-3 sm:flex sm:gap-x-10 sm:py-4">
          <p className="display text-lg">Christina Jewellers</p>
          <div className="col-span-2 row-start-2 -mx-4 px-4 sm:mx-0 sm:px-0"><StaffNav newChoices={newChoices ?? 0} /></div>
          <form action={signOut} className="col-start-2 row-start-1 sm:ml-auto">
            <SubmitButton className="eyebrow min-h-11 hover:text-ink" pendingLabel="Signing out…">Sign out</SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      <Toaster flashKey={(await cookies()).get("flash")?.value} />
    </div>
  );
}
