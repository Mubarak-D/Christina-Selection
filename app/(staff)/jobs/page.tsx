import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JobList } from "@/components/JobList";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("job_cards").select("*, customers(name)")
    .order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl">Job cards</h1>
        <Link href="/jobs/new" className="btn btn-primary">New job card</Link>
      </div>
      {!jobs?.length && (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">
          No job cards yet. Use New job card when a custom order comes in.
        </p>
      )}
      <JobList jobs={jobs ?? []} showCustomer />
    </>
  );
}
