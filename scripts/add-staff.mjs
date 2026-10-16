// Invite a staff member (or grant an existing account) and add them to the staff list.
// Usage: npm run staff:add -- person@example.com
// Uses the project in .env.local; for production run it with the cj-prod values in the environment.
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}
const email = process.argv[2]?.trim().toLowerCase();
if (!email?.includes("@")) {
  console.error("Usage: npm run staff:add -- person@example.com");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
let user = list.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/accept`, // works with the default invite email
  });
  if (error) throw error;
  user = data.user;
  console.log(`Invite email sent to ${email}.`);
}
const { error } = await db.from("staff").upsert({ user_id: user.id });
if (error) throw error;
console.log(`${email} is on the staff list.`);
