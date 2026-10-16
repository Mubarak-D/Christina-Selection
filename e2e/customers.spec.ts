import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = Date.now();
const local = `07${Math.floor(1e7 + Math.random() * 9e7)}`; // e.g. 0712345678
const e164 = `+94${local.slice(1)}`;
const name = `Test Customer ${tag}`;
const email = `cust${tag}@example.test`;

test.afterAll(async () => {
  const db = service();
  await db.from("customers").delete().eq("phone", e164);
  await db.from("customers").delete().eq("email", email);
});

test("add a WhatsApp customer, find them, refuse the number twice", async ({ page }) => {
  await page.goto("/customers/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("WhatsApp number").fill(local);
  await page.getByRole("button", { name: "Save customer" }).click();

  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(e164)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Customer saved" })).toBeVisible();

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

test("email-only customer with a deadline", async ({ page }) => {
  await page.goto("/customers/new");
  await page.getByLabel("Name").fill(`Email ${name}`);
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByLabel("Deadline").fill("2026-12-24");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Needed by 24/12/2026")).toBeVisible();

  await page.goto("/customers");
  await page.getByLabel("Search").fill(`cust${tag}`);
  await page.getByLabel("Search").press("Enter");
  await expect(page.getByRole("link", { name: new RegExp(`Email ${name}`) })).toBeVisible();
});

test("a customer needs a number or an email", async ({ page }) => {
  await page.goto("/customers/new");
  await page.getByLabel("Name").fill("No contact");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add a WhatsApp number or an email" })).toBeVisible();

  await page.getByLabel("WhatsApp number").fill("12");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "isn't a valid phone number" })).toBeVisible();
});
