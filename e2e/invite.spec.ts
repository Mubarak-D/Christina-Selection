import { test, expect } from "@playwright/test";
import { service } from "./helpers";

// Follows Supabase's DEFAULT invite email link (no custom template / SMTP needed).
const email = `invite-${Date.now()}@example.test`;
let userId: string | undefined;

test.afterAll(async () => {
  if (userId) await service().auth.admin.deleteUser(userId);
});

test("an invited staff member sets a password and reaches the dashboard", async ({ page }) => {
  const admin = service().auth.admin;
  const { data, error } = await admin.generateLink({
    type: "invite", email, options: { redirectTo: "http://localhost:3000/auth/accept" },
  });
  expect(error).toBeNull();
  userId = data.user!.id;
  await service().from("staff").upsert({ user_id: userId });

  await page.goto(data.properties!.action_link);
  await expect(page).toHaveURL(/\/account\/password$/, { timeout: 15_000 });
  await page.getByLabel("New password").fill(`Pw-${Date.now()}-ok`);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
