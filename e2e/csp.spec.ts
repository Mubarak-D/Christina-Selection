import { test, expect, type Page } from "@playwright/test";
import { STAFF_STATE } from "./helpers";

// Collects CSP violations reported by the browser while a page loads and runs.
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|CSP/i.test(m.text())) violations.push(m.text()); });
  return violations;
}

test("pages send a nonce-based script policy", async ({ request }) => {
  const res = await request.get("/login");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toContain("'unsafe-inline' 'nonce"); // no blanket inline scripts
  const again = (await request.get("/login")).headers()["content-security-policy"] ?? "";
  expect(again.match(/nonce-([^']+)/)?.[1]).not.toBe(csp.match(/nonce-([^']+)/)?.[1]); // fresh per request
});

test("login and invalid customer link run without CSP violations", async ({ page }) => {
  const v = watchCsp(page);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.goto("/s/nope");
  await expect(page.getByText("This link isn't valid")).toBeVisible();
  expect(v).toEqual([]);
});

test.describe("staff", () => {
  test.use({ storageState: STAFF_STATE });
  test("staff pages and navigation run without CSP violations", async ({ page }) => {
    const v = watchCsp(page);
    for (const path of ["/", "/customers", "/catalogue", "/catalogue/new", "/sets/new", "/customers/new"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    expect(v).toEqual([]);
  });
});
