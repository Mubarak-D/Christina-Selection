import { test, expect, type Page } from "@playwright/test";
import { STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

// Holds matching requests for `ms` so the in-between state is observable.
// Background prefetches (which fetch the loading screen ahead of time) are left alone.
async function slow(page: Page, match: (url: string, method: string) => boolean, ms = 2500) {
  await page.route("**/*", async (route) => {
    const r = route.request();
    const prefetch = !!(await r.allHeaders())["next-router-prefetch"];
    if (!prefetch && match(r.url(), r.method())) await new Promise((res) => setTimeout(res, ms));
    await route.continue();
  });
}

test("navigating shows a loading screen and the progress bar at once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.waitForLoadState("networkidle"); // let the nav links prefetch, as on a real phone
  await slow(page, (url, method) => method === "GET" && url.includes("/customers"));

  await page.getByRole("link", { name: "Customers" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading page" })).toBeVisible({ timeout: 500 });
  await expect(page.getByRole("status", { name: "Loading" })).toBeVisible({ timeout: 1000 });
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("progressbar", { name: "Loading page" })).toBeHidden();
});

test("a submitted form button shows it is working", async ({ page }) => {
  await page.goto("/catalogue/new");
  await page.getByLabel("Title").fill(`Pending check ${Date.now()}`);
  // Hold the save for 3 s, then abort it so no piece is created.
  await page.route("**/catalogue/new", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise((res) => setTimeout(res, 3000));
    await route.abort();
  });

  await page.getByRole("button", { name: "Save piece" }).click();
  const saving = page.getByRole("button", { name: "Saving…" });
  await expect(saving).toBeVisible({ timeout: 500 });
  await expect(saving).toBeDisabled();
});
