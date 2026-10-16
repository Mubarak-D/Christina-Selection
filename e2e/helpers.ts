import { createClient } from "@supabase/supabase-js";

export const STAFF_STATE = "e2e/.auth/staff.json";
// A second session, only for the sign-out test, so signing out doesn't end the shared one.
export const SIGNOUT_STATE = "e2e/.auth/staff-signout.json";

export const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
