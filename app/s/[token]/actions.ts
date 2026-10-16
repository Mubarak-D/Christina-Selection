"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type SubmitResult = "ok" | "invalid" | "locked" | "error";

// All checks (token, lock, piece ids) happen atomically inside submit_selection().
export async function submitSelection(token: string, chosen: string[]): Promise<SubmitResult> {
  const { data, error } = await createServiceClient().rpc("submit_selection", {
    p_token: String(token),
    p_chosen: Array.isArray(chosen) ? chosen.map(String) : [],
  });
  if (error) return error.code === "22P02" ? "invalid" : "error"; // 22P02: a chosen id isn't a uuid
  return data as SubmitResult;
}
