import { test, expect } from "@playwright/test";
import { closeSync, openSync, ftruncateSync } from "node:fs";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
const created: string[] = [];

test.afterAll(async () => {
  const db = service();
  for (const id of created) {
    const { data } = await db.storage.from("media").list(id);
    if (data?.length) await db.storage.from("media").remove(data.map((f) => `${id}/${f.name}`));
  }
  if (created.length) await db.from("pieces").delete().in("id", created);
});

test("add a piece with a photo and a video in one go", async ({ page }) => {
  await page.goto("/catalogue/new");
  await page.getByLabel("Title").fill(`Test Ring ${tag}`);
  await page.getByLabel("Price").fill("100");
  // Files are picked before saving; they're shown and uploaded with the save.
  await page.getByLabel("Add photos or videos").setInputFiles(["e2e/fixtures/ring.jpg", "e2e/fixtures/ring.mp4"]);
  await expect(page.getByRole("list", { name: "Chosen files" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Save piece" }).click();
  await expect(page).toHaveURL(/\/catalogue\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  created.push(page.url().split("/").pop()!);
  await expect(page.getByRole("status").filter({ hasText: "Piece saved" })).toBeVisible();

  const media = page.getByRole("list", { name: "Media" });
  // Uploads go over the network to Supabase; allow for a slow connection.
  await expect(media.locator("img")).toHaveCount(1, { timeout: 20_000 });
  await expect(media.locator("video")).toHaveCount(1, { timeout: 20_000 });

  await page.goto("/catalogue");
  await expect(page.getByRole("link", { name: new RegExp(`Test Ring ${tag}`) })).toBeVisible();
});

test("one-off pieces are not listed in the catalogue", async ({ page }) => {
  const { data } = await service().from("pieces")
    .insert({ title: `One-off ${tag}`, in_catalogue: false }).select().single();
  created.push(data!.id);
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { name: "Catalogue" })).toBeVisible();
  await expect(page.getByText(`One-off ${tag}`)).toHaveCount(0);
});

test("files over 50 MB are refused", async ({ page }, testInfo) => {
  const { data } = await service().from("pieces").insert({ title: `Big ${tag}` }).select().single();
  created.push(data!.id);
  await page.goto(`/catalogue/${data!.id}`);
  const huge = testInfo.outputPath("huge.mp4");
  const fd = openSync(huge, "w");
  ftruncateSync(fd, 51 * 1024 * 1024); // sparse file, takes no real disk space
  closeSync(fd);
  await page.getByLabel("Add photos or videos").setInputFiles(huge);
  // Next.js also renders a route-announcer alert, so match ours by text.
  await expect(page.getByRole("alert").filter({ hasText: "Max 50 MB per file" })).toBeVisible();
});
