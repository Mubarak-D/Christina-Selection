import { createClient } from "@supabase/supabase-js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const anon = () => createClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, opts);
export const service = () => createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);

// Deletes rows created by a test. Customers cascade to their sets and items.
export async function cleanup(ids: { customers?: string[]; pieces?: string[] }) {
  const db = service();
  if (ids.customers?.length) await db.from("customers").delete().in("id", ids.customers);
  if (ids.pieces?.length) await db.from("pieces").delete().in("id", ids.pieces);
}
