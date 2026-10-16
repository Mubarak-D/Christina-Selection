import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const local = `07${Math.floor(1e7 + Math.random() * 9e7)}`; // e.g. 0712345678
const e164 = `+94${local.slice(1)}`;
const name = `Test Customer ${Date.now()}`;

test.afterAll(async () => {
  await service().from("customers").delete().eq("phone", e164);
});

test("add a customer, then refuse the same number twice", async ({ page }) => {
  await page.goto("/customers/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("WhatsApp number").fill(local);
  await page.getByLabel("Birthday").fill("1990-05-20");
  await page.getByRole("button", { name: "Save customer" }).click();

  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(e164)).toBeVisible();

  await page.goto("/customers");
  await page.getByLabel("Search").fill(`${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`); // typed the local way
  await page.getByLabel("Search").press("Enter");
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

  await page.goto("/customers/new");
  await page.getByLabel("Name").fill("Duplicate");
  await page.getByLabel("WhatsApp number").fill(e164);
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "A customer with this number already exists" })).toBeVisible();
});

test("an impossible number is refused", async ({ page }) => {
  await page.goto("/customers/new");
  await page.getByLabel("Name").fill("Bad number");
  await page.getByLabel("WhatsApp number").fill("12");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn't a valid phone number" })).toBeVisible();
});
