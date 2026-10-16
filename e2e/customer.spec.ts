import { test, expect, devices } from "@playwright/test";
import { service } from "./helpers";

// Phone-sized, touch-enabled Chromium (customers open the link on their phones).
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

const tag = `${Date.now()}`;
let customerId: string, setId: string, token: string;
const ids: string[] = [];
const titles = [`Ring ${tag}`, `Bangle ${tag}`, `Pendant ${tag}`];

test.beforeAll(async () => {
  const db = service();
  const { data: c } = await db.from("customers")
    .insert({ name: `Nadia Test${tag}`, phone: `+9475${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
  const { data: p } = await db.from("pieces").insert(titles.map((title, i) => ({
    title, price: 50000 * (i + 1), metal: "Gold", karat: "22K", weight_g: 4.5,
  }))).select();
  ids.push(...titles.map((t) => p!.find((x) => x.title === t)!.id));
  const { data: s } = await db.from("selection_sets")
    .insert({ customer_id: customerId, title: "Your shortlist", sent_at: new Date().toISOString() }).select().single();
  setId = s!.id; token = s!.token;
  await db.from("set_items").insert(ids.map((piece_id) => ({ set_id: setId, piece_id })));
});

test.afterAll(async () => {
  const db = service();
  await db.from("customers").delete().eq("id", customerId);
  await db.from("pieces").delete().in("id", ids);
});

const statuses = async () => {
  const { data } = await service().from("set_items").select("piece_id,status").eq("set_id", setId);
  return ids.map((id) => data!.find((r) => r.piece_id === id)!.status);
};

test("customer chooses, changes their mind, then the set locks", async ({ page }) => {
  await page.goto(`/s/${token}`);
  await expect(page.getByRole("heading", { name: "Your shortlist" })).toBeVisible();
  await expect(page.getByText("Hi Nadia")).toBeVisible();
  await expect(page.getByText("22K")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "None of these" })).toBeVisible();

  await page.getByRole("button", { name: `Choose ${titles[0]}` }).click();
  await page.getByRole("button", { name: `Choose ${titles[1]}` }).click();
  await expect(page.getByRole("button", { name: `Choose ${titles[0]}` })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Submit my choice (2)" }).click();

  const thanks = page.getByRole("region", { name: "Thank you" });
  await expect(thanks).toBeVisible();
  await expect(thanks.getByRole("listitem")).toHaveCount(2);
  expect(await statuses()).toEqual(["chosen", "chosen", "dismissed"]);

  await page.getByRole("button", { name: "Change my choice" }).click();
  await page.getByRole("button", { name: `Choose ${titles[1]}` }).click(); // un-choose
  await page.getByRole("button", { name: "Submit my choice (1)" }).click();
  await expect(thanks.getByRole("listitem")).toHaveCount(1);
  expect(await statuses()).toEqual(["chosen", "dismissed", "dismissed"]);

  await service().from("selection_sets").update({ handled_at: new Date().toISOString() }).eq("id", setId);
  await page.reload();
  await expect(page.getByText("Your jeweller is preparing your selection")).toBeVisible();
  // Scoped to main: the dev server adds its own Next.js tools button.
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
});

test("an unknown link says so", async ({ page }) => {
  await page.goto("/s/nope");
  await expect(page.getByText("This link isn't valid")).toBeVisible();
});
