// Manual UI/a11y audit, not part of the suite.
// Run: SHOTS_DIR=… IMG_DIR=… npx playwright test e2e/audit.manual.ts --config e2e/screenshots.config.ts
import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { service, STAFF_STATE } from "./helpers";

const OUT = process.env.SHOTS_DIR ?? "test-results/audit";
const IMG_DIR = process.env.IMG_DIR!;
const WIDTHS = [375, 768, 1440];

test("audit every page", async ({ browser }) => {
  test.setTimeout(300_000);
  const db = service();
  const { data: c } = await db.from("customers")
    .insert({ name: "Audit Nadia Perera", phone: "+94770004444", email: "audit@example.test", deadline: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), notes: "Prefers yellow gold." })
    .select().single();
  const { data: pieces } = await db.from("pieces").insert([
    { title: "Audit Solitaire Ring", price: 285000, metal: "Yellow gold", karat: "22K", weight_g: 4.2, stones: "0.5ct diamond", description: "A single brilliant-cut diamond on a slim band.", in_catalogue: true },
    { title: "Audit Kandyan Bangle with a deliberately long name to test wrapping", price: 410000, metal: "Yellow gold", karat: "22K", weight_g: 18.6, in_catalogue: true },
  ]).select();
  for (const [i, p] of pieces!.entries()) {
    const path = `${p.id}/audit.jpg`;
    await db.storage.from("media").upload(path, readFileSync(`${IMG_DIR}/${["piece_0xE8D9B5.jpg", "piece_0xD9C7A3.jpg"][i]}`), { contentType: "image/jpeg" });
    await db.from("piece_media").insert({ piece_id: p.id, path, kind: "image" });
  }
  const { data: s } = await db.from("selection_sets").insert({ customer_id: c!.id, title: "Audit shortlist", sent_at: new Date().toISOString() }).select().single();
  await db.from("set_items").insert(pieces!.map((p) => ({ set_id: s!.id, piece_id: p.id })));
  await db.from("sales").insert({ customer_id: c!.id, set_id: s!.id, piece_id: pieces![0].id, title: pieces![0].title, price: pieces![0].price });

  const pages: [string, string, boolean][] = [
    ["login", "/login", false],
    ["customer", `/s/${s!.token}`, false],
    ["invalid-link", "/s/nope", false],
    ["dashboard", "/", true],
    ["customers", "/customers", true],
    ["customer-detail", `/customers/${c!.id}`, true],
    ["customer-new", "/customers/new", true],
    ["catalogue", "/catalogue", true],
    ["piece", `/catalogue/${pieces![0].id}`, true],
    ["piece-new", "/catalogue/new", true],
    ["set-new", `/sets/new?customer=${c!.id}`, true],
    ["set", `/sets/${s!.id}`, true],
  ];
  const report: Record<string, unknown> = {};
  try {
    for (const width of WIDTHS) {
      for (const staff of [false, true]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(staff ? { storageState: STAFF_STATE } : {}) });
        const page = await ctx.newPage();
        for (const [name, path, needsStaff] of pages.filter((p) => p[2] === staff)) {
          await page.goto(path);
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${OUT}/audit-${name}-${width}.png`, fullPage: true });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          if (width === 375 || width === 1440) {
            const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
            report[`${name}@${width}`] = {
              overflowX: overflow,
              violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })),
            };
          } else report[`${name}@${width}`] = { overflowX: overflow };
          void needsStaff;
        }
        await ctx.close();
      }
    }
  } finally {
    writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(report, null, 2));
    for (const p of pieces!) await db.storage.from("media").remove([`${p.id}/audit.jpg`]);
    await db.from("customers").delete().eq("id", c!.id);
    await db.from("pieces").delete().in("id", pieces!.map((p) => p.id));
  }
});
