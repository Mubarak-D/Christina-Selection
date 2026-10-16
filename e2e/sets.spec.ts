import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
let customerId: string;
const pieceIds: string[] = [];

test.beforeAll(async () => {
  const db = service();
  const { data: c } = await db.from("customers")
    .insert({ name: `Ana Test${tag}`, phone: `+9476${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
  const { data: p } = await db.from("pieces")
    .insert([{ title: `Ring ${tag}`, price: 1000 }, { title: `Bangle ${tag}`, price: 2000 }]).select();
  pieceIds.push(...p!.map((x) => x.id));
});

test.afterAll(async () => {
  const db = service();
  await db.from("customers").delete().eq("id", customerId);
  await db.from("pieces").delete().in("id", pieceIds);
  const { data: oneOffs } = await db.from("pieces").select("id").eq("title", `One-off ${tag}`);
  for (const { id } of oneOffs ?? []) {
    const { data: files } = await db.storage.from("media").list(id);
    if (files?.length) await db.storage.from("media").remove(files.map((f) => `${id}/${f.name}`));
  }
  await db.from("pieces").delete().eq("title", `One-off ${tag}`);
});

test("build a set, add a one-off, send it and mark it handled", async ({ page, context }) => {
  await page.goto(`/sets/new?customer=${customerId}`);
  await page.getByLabel(`Ring ${tag}`).check();
  await page.getByLabel(`Bangle ${tag}`).check();
  await page.getByLabel("Set title").fill("Wedding rings");
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page).toHaveURL(/\/sets\/[0-9a-f-]{36}$/);
  const setId = page.url().split("/").pop()!;
  await expect(page.getByRole("status").filter({ hasText: "Set created" })).toBeVisible();
  const setUrl = page.url();

  await expect(page.getByText(`Ring ${tag}`)).toBeVisible();
  await expect(page.getByText(`Bangle ${tag}`)).toBeVisible();

  // One-off piece: details here, then photos on its own page, then back to the set.
  await page.getByText("Add a one-off piece to this set").click();
  const oneOff = page.getByRole("form", { name: "Add one-off piece" });
  await oneOff.getByLabel("Title").fill(`One-off ${tag}`);
  await oneOff.getByLabel("Add photos or videos").setInputFiles("e2e/fixtures/ring.jpg");
  await oneOff.getByRole("button", { name: "Add one-off piece" }).click();
  // Stays on the set; the one-off appears with its photo.
  await expect(page.getByText(`One-off ${tag}`)).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(setUrl);
  await expect(page.getByRole("img", { name: `One-off ${tag}` })).toBeVisible();

  const send = page.getByRole("link", { name: "Send on WhatsApp" });
  const href = await send.getAttribute("href");
  expect(href).toMatch(new RegExp(`^https://wa\\.me/9476${tag.slice(-7)}\\?text=`));
  expect(decodeURIComponent(href!.split("text=")[1])).toContain("Hi Ana,");
  expect(decodeURIComponent(href!.split("text=")[1])).toMatch(/\/s\/[A-Za-z0-9_-]{32}$/);

  const popup = context.waitForEvent("page");
  await send.click();
  await (await popup).close();
  await expect.poll(async () =>
    (await service().from("selection_sets").select("sent_at").eq("id", setId).single()).data!.sent_at,
  ).not.toBeNull();

  await page.getByRole("button", { name: "Mark handled" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Marked handled" })).toBeVisible();
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByRole("button", { name: "Mark handled" })).toBeVisible();
});
