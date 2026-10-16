import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { service, STAFF_STATE } from "./helpers";

const tag = `${Date.now()}`;
let customerId: string, pieceId: string, token: string;

test.beforeAll(async () => {
  const db = service();
  const { data: c } = await db.from("customers")
    .insert({ name: `Preview Test${tag}`, phone: `+9471${tag.slice(-7)}` }).select().single();
  customerId = c!.id;
  const { data: p } = await db.from("pieces").insert({ title: `Preview Ring ${tag}` }).select().single();
  pieceId = p!.id;
  for (const [i, [file, type]] of ([["ring.jpg", "image/jpeg"], ["ring.mp4", "video/mp4"]] as const).entries()) {
    const path = `${pieceId}/preview-${i}.${file.split(".")[1]}`;
    await db.storage.from("media").upload(path, readFileSync(`e2e/fixtures/${file}`), { contentType: type });
    await db.from("piece_media").insert({ piece_id: pieceId, path, kind: type.startsWith("video") ? "video" : "image", sort: i });
  }
  const { data: s } = await db.from("selection_sets").insert({ customer_id: customerId }).select().single();
  token = s!.token;
  await db.from("set_items").insert({ set_id: s!.id, piece_id: pieceId });
});

test.afterAll(async () => {
  const db = service();
  await db.storage.from("media").remove([`${pieceId}/preview-0.jpg`, `${pieceId}/preview-1.mp4`]);
  await db.from("customers").delete().eq("id", customerId);
  await db.from("pieces").delete().eq("id", pieceId);
});

test("customer taps a photo to see it full screen, then closes it", async ({ page }) => {
  await page.goto(`/s/${token}`);
  await page.getByRole("button", { name: `View Preview Ring ${tag} full screen` }).first().click();
  const viewer = page.getByRole("dialog", { name: `Preview Ring ${tag}` });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("img")).toBeVisible();
  await expect(viewer.locator("video")).toHaveCount(1); // the piece's video is one swipe away
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("on a laptop, arrows move through a piece's photos and videos", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/s/${token}`);
  const gallery = page.getByRole("region", { name: `Preview Ring ${tag} photos and videos` });
  await expect(gallery.getByRole("button", { name: "Previous" })).toBeDisabled();
  await gallery.getByRole("button", { name: "Next" }).click();
  await expect(gallery.locator("video")).toBeInViewport({ ratio: 0.9 });
  await expect(gallery.getByRole("button", { name: "Next" })).toBeDisabled();
});

test.describe("staff", () => {
  test.use({ storageState: STAFF_STATE });

  test("tapping a video on a piece page plays it full screen", async ({ page }) => {
    await page.goto(`/catalogue/${pieceId}`);
    await page.getByRole("button", { name: `View Preview Ring ${tag} full screen` }).nth(1).click();
    const viewer = page.getByRole("dialog", { name: `Preview Ring ${tag}` });
    await expect(viewer).toBeVisible();
    await expect(viewer.locator("video[controls]")).toBeInViewport();
    await viewer.getByRole("button", { name: "Close" }).click();
    await expect(viewer).toBeHidden();
  });
});
