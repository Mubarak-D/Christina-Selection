import { createBrowserClient as create } from "@supabase/ssr";

// Browser client for the signed-in staff app (used for direct media uploads).
export const createBrowserClient = () =>
  create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
