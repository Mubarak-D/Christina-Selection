"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPassword(_prev: string | null, formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) return "Use at least 10 characters.";
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return error.message;
  redirect("/");
}
