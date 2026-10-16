import { createBrowserClient as create } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Browser client for the signed-in staff app (used for direct media uploads).
export const createBrowserClient = () =>
  create<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
