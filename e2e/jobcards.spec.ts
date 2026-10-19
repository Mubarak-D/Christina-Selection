import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
let customerId: string;

test.beforeAll(async () => {
  const { data: c } = await service().from("customers")
    .insert({ name: `Jobcard Nimal ${tag}`, phone: `+9476${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
});

test.afterAll(async () => {
  await service().from("customers").delete().eq("id", customerId); // job cards go by cascade
});

test("manual job card: draft until answered, clean print, then REVISION 2 after an edit", async ({ page }) => {
  // Create a walk-in card: everything required is missing, so it's a draft.
  await page.goto(`/jobs/new?customer=${customerId}`);
  await page.getByLabel("Order came by").selectOption("walk_in");
  await page.getByRole("button", { name: "Create job card" }).click();
  await expect(page.getByText("Draft · not confirmed")).toBeVisible();
  const cardUrl = page.url();

  // Fill three required fields; Size is still missing.
  await page.locator("input[name=item]").fill("Ring");
  await page.locator("input[name=metal]").fill("Yellow gold");
  await page.locator("input[name=purity]").fill("22K");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Size not given")).toBeVisible();
  await expect(page.getByText("Item not given")).toHaveCount(0);

  await page.goto(`${cardUrl}/print`);
  await expect(page.getByText("DRAFT – NOT CONFIRMED")).toBeVisible();
  await expect(page.getByText("Size not given")).toBeVisible();

  // Answering the question fills the field and clears the draft.
  await page.goto(cardUrl);
  await page.getByPlaceholder("Answer fills Size").fill("14");
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByText("Ready for the maker")).toBeVisible();
  await expect(page.locator("input[name=size]")).toHaveValue("14");

  // Clean print; pressing Print stamps the card (the dialog itself is stubbed).
  await page.goto(`${cardUrl}/print`);
  await expect(page.getByText("DRAFT – NOT CONFIRMED")).toHaveCount(0);
  await expect(page).toHaveTitle(new RegExp(`^\\d{4}-\\d{2}-\\d{2}_Jobcard-Nimal-${tag}$`));
  await page.evaluate(() => { window.print = () => { document.body.dataset.printed = "yes"; }; });
  await page.getByRole("button", { name: "Print" }).click();
  await expect(page.locator("body[data-printed=yes]")).toHaveCount(1);

  // An edit after printing starts revision 2, with the old value crossed out.
  await page.goto(cardUrl);
  await expect(page.getByText(/Printed/)).toBeVisible();
  await page.locator("input[name=size]").fill("16");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText(/Revision 2/)).toBeVisible();

  const readBack = page.getByRole("link", { name: "Read back on WhatsApp" });
  await expect(readBack).toHaveAttribute("href", new RegExp(`^https://wa\\.me/9476${tag.slice(-7)}\\?text=`));
  expect(decodeURIComponent((await readBack.getAttribute("href"))!.split("text=")[1])).toContain("Size: 16");

  await page.goto(`${cardUrl}/print`);
  await expect(page.getByText("REVISION 2")).toBeVisible();
  await expect(page.locator("s", { hasText: "14" })).toBeVisible();

  // Listed on the customer's page.
  await page.goto(`/customers/${customerId}`);
  await expect(page.getByRole("region", { name: "Job cards" }).getByText("Ready")).toBeVisible();
});
