"use server";

import { createClient } from "@/lib/supabase/server";

// Unseen customer choices, for the nav badge (layouts don't re-render on client navigation).
export async function newChoiceCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("alerts").select("*", { count: "exact", head: true })
    .eq("kind", "new_choice").eq("is_new", true);
  return count ?? 0;
}
