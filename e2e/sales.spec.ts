import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
let customerId: string, setId: string;
const ids: string[] = [];

test.beforeAll(async () => {
  const db = service();
  const { data: c } = await db.from("customers").insert({ name: `Buyer ${tag}`, phone: `+9477${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
  const { data: p } = await db.from("pieces").insert([
    { title: `Sold Ring ${tag}`, price: 120000, in_catalogue: true },
    { title: `Unsold Chain ${tag}`, price: 80000, in_catalogue: true },
  ]).select();
  ids.push(p!.find((x) => x.title.startsWith("Sold"))!.id, p!.find((x) => x.title.startsWith("Unsold"))!.id);
  const { data: s } = await db.from("selection_sets").insert({ customer_id: customerId, title: "Sale test" }).select().single();
  setId = s!.id;
  await db.from("set_items").insert(ids.map((piece_id) => ({ set_id: setId, piece_id })));
  await db.rpc("submit_selection", { p_token: s!.token, p_chosen: [ids[0]] });
});

test.afterAll(async () => {
  await service().from("customers").delete().eq("id", customerId);
  await service().from("pieces").delete().in("id", ids);
});

test("marking handled records what was bought on the customer's page", async ({ page }) => {
  await page.goto(`/sets/${setId}`);
  await page.getByRole("button", { name: "Mark handled" }).click();
  const dialog = page.getByRole("dialog", { name: "What did they buy?" });
  await expect(dialog.getByRole("checkbox", { name: new RegExp(`Sold Ring ${tag}`) })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: new RegExp(`Unsold Chain ${tag}`) })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Mark handled" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 sale recorded" })).toBeVisible();

  await page.goto(`/customers/${customerId}`);
  const purchases = page.getByRole("region", { name: "Purchases" });
  await expect(purchases.getByText(`Sold Ring ${tag}`)).toBeVisible();
  await expect(purchases.getByText(`Unsold Chain ${tag}`)).toHaveCount(0);
  await expect(purchases.getByRole("listitem").filter({ hasText: "Total" })).toContainText("120,000");

  // Reopen keeps the record; handling again replaces it (here: nothing bought after all).
  await page.goto(`/sets/${setId}`);
  await page.getByRole("button", { name: "Reopen" }).click();
  await page.getByRole("button", { name: "Mark handled" }).click();
  const again = page.getByRole("dialog", { name: "What did they buy?" });
  await again.getByRole("checkbox", { name: new RegExp(`Sold Ring ${tag}`) }).uncheck();
  await again.getByRole("button", { name: "Mark handled" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page.goto(`/customers/${customerId}`);
  await expect(page.getByRole("region", { name: "Purchases" })).toHaveCount(0);
});
