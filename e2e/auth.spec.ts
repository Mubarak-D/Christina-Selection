import { test, expect } from "@playwright/test";
import { SIGNOUT_STATE, STAFF_STATE } from "./helpers";

test.describe("signed out", () => {
  test("staff pages redirect to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("customer links do not redirect", async ({ page }) => {
    await page.goto("/s/anything");
    await expect(page).toHaveURL(/\/s\/anything$/);
  });
});

test.describe("signed in", () => {
  test.use({ storageState: STAFF_STATE });

  test("dashboard shows the staff nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

});

test.describe("sign out", () => {
  test.use({ storageState: SIGNOUT_STATE });

  test("returns to login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
