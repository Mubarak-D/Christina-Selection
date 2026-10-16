// Manual visual check, not part of the suite (not matched by *.spec.ts).
// Run: npx playwright test e2e/screenshots.manual.ts --config e2e/screenshots.config.ts
import { test, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { service, STAFF_STATE } from "./helpers";

const OUT = process.env.SHOTS_DIR ?? "test-results/shots";
const IMG_DIR = process.env.IMG_DIR!;
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["Pixel 7"];

test("capture", async ({ browser }) => {
  const db = service();
  const { data: c } = await db.from("customers").insert({ name: "Nadia Perera", phone: "+94770009999" }).select().single();
  const specs = [
    { title: "Solitaire Ring", price: 285000, metal: "Yellow gold", karat: "22K", weight_g: 4.2, stones: "0.5ct diamond", description: "A single brilliant-cut diamond on a slim band." },
    { title: "Kandyan Bangle", price: 410000, metal: "Yellow gold", karat: "22K", weight_g: 18.6, stones: null, description: "Hand-engraved traditional motif." },
    { title: "Pearl Drop Pendant", price: 96000, metal: "White gold", karat: "18K", weight_g: 2.1, stones: "South Sea pearl", description: null },
  ];
  const { data: pieces } = await db.from("pieces").insert(specs).select();
  const imgs = ["piece_0xE8D9B5.jpg", "piece_0xD9C7A3.jpg", "piece_0xEFE6D2.jpg"];
  for (const [i, p] of pieces!.entries()) {
    const path = `${p.id}/demo.jpg`;
    await db.storage.from("media").upload(path, readFileSync(`${IMG_DIR}/${imgs[i]}`), { contentType: "image/jpeg" });
    await db.from("piece_media").insert({ piece_id: p.id, path, kind: "image" });
  }
  const { data: s } = await db.from("selection_sets")
    .insert({ customer_id: c!.id, title: "Engagement shortlist", sent_at: new Date().toISOString() }).select().single();
  await db.from("set_items").insert(pieces!.map((p) => ({ set_id: s!.id, piece_id: p.id })));

  try {
    const phone = await browser.newPage({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });
    await phone.goto(`/s/${s!.token}`);
    await phone.waitForTimeout(800);
    await phone.screenshot({ path: `${OUT}/1-customer-top.png` });
    await phone.getByRole("button", { name: "View Solitaire Ring full screen" }).first().click();
    await phone.waitForTimeout(600);
    await phone.screenshot({ path: `${OUT}/1b-customer-viewer.png` });
    await phone.keyboard.press("Escape");
    await phone.getByRole("button", { name: "Choose Solitaire Ring" }).click();
    await phone.waitForTimeout(400);
    await phone.screenshot({ path: `${OUT}/2-customer-selected.png` });
    await phone.getByRole("button", { name: /Submit my choice/ }).click();
    await phone.waitForTimeout(1200);
    await phone.screenshot({ path: `${OUT}/3-customer-thanks.png` });

    const staff = await browser.newPage({ storageState: STAFF_STATE, viewport: { width: 1280, height: 860 } });
    await staff.goto("/");
    await staff.screenshot({ path: `${OUT}/4-staff-dashboard.png` });
    await staff.goto(`/sets/${s!.id}`);
    await staff.screenshot({ path: `${OUT}/5-staff-set.png` });
    await staff.goto("/catalogue");
    await staff.screenshot({ path: `${OUT}/6-staff-catalogue.png` });
    await staff.goto("/login");
  } finally {
    for (const p of pieces!) await db.storage.from("media").remove([`${p.id}/demo.jpg`]);
    await db.from("customers").delete().eq("id", c!.id);
    await db.from("pieces").delete().in("id", pieces!.map((p) => p.id));
  }
});
