import { test as setup, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import type { Browser } from "@playwright/test";
import { service, SIGNOUT_STATE, STAFF_STATE } from "./helpers";

// Creates (or resets) a cj-dev staff user with a fresh random password each run,
// logs in through the real form, and saves the session. The password is never stored.
const EMAIL = "e2e-staff@example.test";

setup("log in as staff", async ({ browser }) => {
  const password = randomBytes(18).toString("base64url");
  const admin = service().auth.admin;
  const { data: list } = await admin.listUsers();
  const existing = list.users.find((u) => u.email === EMAIL);
  const userId = existing
    ? (await admin.updateUserById(existing.id, { password }), existing.id)
    : (await admin.createUser({ email: EMAIL, password, email_confirm: true })).data.user!.id;
  await service().from("staff").upsert({ user_id: userId });

  await logIn(browser, password, STAFF_STATE);
  await logIn(browser, password, SIGNOUT_STATE);
});

async function logIn(browser: Browser, password: string, statePath: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await context.storageState({ path: statePath });
  await context.close();
}
