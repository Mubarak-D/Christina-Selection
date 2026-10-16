import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
let customerId: string, setId: string, catalogueId: string, oneOffId: string, spareId: string;

const exists = async (table: "customers" | "pieces" | "selection_sets", id: string) =>
  ((await service().from(table).select("id").eq("id", id)).data ?? []).length === 1;
const files = async (pieceId: string) => ((await service().storage.from("media").list(pieceId)).data ?? []).length;

test.beforeAll(async () => {
  const db = service();
  const { data: c } = await db.from("customers").insert({ name: `Delete Me ${tag}`, phone: `+9470${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
  const { data: pieces } = await db.from("pieces").insert([
    { title: `Cat Ring ${tag}`, in_catalogue: true }, { title: `One-off ${tag}`, in_catalogue: false }, { title: `Spare ${tag}`, in_catalogue: true },
  ]).select();
  [catalogueId, oneOffId, spareId] = [`Cat Ring ${tag}`, `One-off ${tag}`, `Spare ${tag}`].map((t) => pieces!.find((p) => p.title === t)!.id);
  for (const id of [catalogueId, oneOffId, spareId]) {
    await db.storage.from("media").upload(`${id}/a.jpg`, readFileSync("e2e/fixtures/ring.jpg"), { contentType: "image/jpeg" });
    await db.from("piece_media").insert({ piece_id: id, path: `${id}/a.jpg`, kind: "image" });
  }
  const { data: s } = await db.from("selection_sets").insert({ customer_id: customerId, title: `Doomed ${tag}` }).select().single();
  setId = s!.id;
  await db.from("set_items").insert([catalogueId, oneOffId, spareId].map((piece_id) => ({ set_id: setId, piece_id })));
});

test.afterAll(async () => {
  const db = service();
  for (const id of [catalogueId, oneOffId, spareId]) await db.storage.from("media").remove([`${id}/a.jpg`]);
  await db.from("customers").delete().eq("id", customerId);
  await db.from("pieces").delete().in("id", [catalogueId, oneOffId, spareId]);
});

test("remove pieces from a set, delete the set, then the customer", async ({ page }) => {
  await page.goto(`/sets/${setId}`);

  // Cancel keeps it.
  await page.getByRole("button", { name: `Remove Spare ${tag} from set` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("link", { name: `Spare ${tag}` })).toBeVisible();

  // A catalogue piece leaves the set but stays in the catalogue.
  await page.getByRole("button", { name: `Remove Spare ${tag} from set` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Removed from set" })).toBeVisible();
  await expect(page.getByRole("link", { name: `Spare ${tag}` })).toHaveCount(0);
  expect(await exists("pieces", spareId)).toBe(true);

  // Deleting the set also deletes its one-off piece and that piece's photo; catalogue pieces stay.
  await page.getByRole("button", { name: "Delete set" }).click();
  await expect(page.getByRole("dialog")).toContainText("one-off");
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(new RegExp(`/customers/${customerId}$`));
  await expect(page.getByRole("status").filter({ hasText: "Set deleted" })).toBeVisible();
  expect(await exists("selection_sets", setId)).toBe(false);
  expect(await exists("pieces", oneOffId)).toBe(false);
  expect(await files(oneOffId)).toBe(0);
  expect(await exists("pieces", catalogueId)).toBe(true);

  await page.getByRole("button", { name: "Delete customer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(page.getByRole("status").filter({ hasText: "Customer deleted" })).toBeVisible();
  expect(await exists("customers", customerId)).toBe(false);
});

test("delete a catalogue piece and its photos", async ({ page }) => {
  await page.goto(`/catalogue/${catalogueId}`);
  await page.getByRole("button", { name: "Delete piece" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/catalogue$/);
  await expect(page.getByRole("status").filter({ hasText: "Piece deleted" })).toBeVisible();
  expect(await exists("pieces", catalogueId)).toBe(false);
  expect(await files(catalogueId)).toBe(0);
});
