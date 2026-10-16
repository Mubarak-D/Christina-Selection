import { afterAll, describe, expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { service, cleanup } from "./helpers";

// A signed-in account that is NOT on the staff list (e.g. someone who signed up themselves).
const email = `outsider-${Date.now()}@example.test`;
const password = randomBytes(18).toString("base64url");
let userId: string, customerId: string;

afterAll(async () => {
  if (userId) await service().auth.admin.deleteUser(userId);
  if (customerId) await cleanup({ customers: [customerId] });
});

describe("staff list", () => {
  test("a signed-in non-staff account sees and changes nothing", async () => {
    const { data: u } = await service().auth.admin.createUser({ email, password, email_confirm: true });
    userId = u.user!.id;
    const { data: c } = await service().from("customers")
      .insert({ name: "TEST outsider", phone: `+9478${Date.now() % 1e7}` }).select().single();
    customerId = c!.id;

    const outsider = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await outsider.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    expect((await outsider.from("customers").select()).data).toEqual([]);
    expect((await outsider.from("alerts").select()).data ?? []).toEqual([]);
    const ins = await outsider.from("pieces").insert({ title: "TEST outsider piece" });
    expect(ins.error).not.toBeNull();
    const list = await outsider.storage.from("media").list();
    expect(list.data ?? []).toEqual([]);
  });
});
