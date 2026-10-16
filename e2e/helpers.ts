import { createClient } from "@supabase/supabase-js";

export const STAFF_STATE = "e2e/.auth/staff.json";

export const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
