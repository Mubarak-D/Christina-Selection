import { test as setup, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { service, STAFF_STATE } from "./helpers";

// Creates (or resets) a cj-dev staff user with a fresh random password each run,
// logs in through the real form, and saves the session. The password is never stored.
const EMAIL = "e2e-staff@example.test";

setup("log in as staff", async ({ page }) => {
  const password = randomBytes(18).toString("base64url");
  const admin = service().auth.admin;
  const { data: list } = await admin.listUsers();
  const existing = list.users.find((u) => u.email === EMAIL);
  if (existing) await admin.updateUserById(existing.id, { password });
  else await admin.createUser({ email: EMAIL, password, email_confirm: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: STAFF_STATE });
});
