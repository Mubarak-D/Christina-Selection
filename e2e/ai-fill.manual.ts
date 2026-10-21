// Manual check of "Fill with AI" against the real Gemini free tier, not part of the suite
// (it spends free quota and depends on Google). Needs GEMINI_API_KEY in .env.local.
// Run: npx playwright test e2e/ai-fill.manual.ts --config e2e/screenshots.config.ts --project=shots
import { test, expect, type Page } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });
// Each fill can take up to ~45 s and is retried once if Google is busy.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const tag = `${Date.now()}`;
let customerId: string;

test.beforeAll(async () => {
  const { data } = await service().from("customers")
    .insert({ name: `AI Dummy ${tag}`, phone: `+9475${tag.slice(-7)}` }).select().single();
  customerId = data!.id;
});
test.afterAll(async () => { await service().from("customers").delete().eq("id", customerId); });

async function card(chat: string, extra: { fields?: Record<string, string>; edited?: string[] } = {}) {
  const { data } = await service().from("job_cards").insert({
    customer_id: customerId, source: "whatsapp",
    customer_words: [{ at: new Date().toISOString(), text: chat }],
    fields: extra.fields ?? {}, edited: extra.edited ?? [],
  }).select("id").single();
  return data!.id as string;
}

// Presses Fill with AI and returns what the page shows. One retry if Google is busy.
async function fill(page: Page, id: string, chat: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto(`/jobs/${id}`);
    await page.getByRole("button", { name: "Fill with AI" }).click();
    const toast = page.getByRole("status").filter({ hasText: /Filled by AI|busy|limit|Too many|couldn't|didn't|declined|wasn't|cut short/i });
    await expect(toast).toBeVisible({ timeout: 70_000 });
    const message = (await toast.textContent())!.trim();
    if (/Filled by AI/.test(message)) break;
    if (attempt === 2) throw new Error(`AI fill failed twice: ${message}`);
  }
  await page.goto(`/jobs/${id}`);
  const value = (name: string) => page.locator(`[name=${name}]`).inputValue();
  const fields = Object.fromEntries(await Promise.all(
    ["item", "metal", "purity", "size", "weight", "stones", "engraving", "finish", "design", "instructions_en", "instructions_si"]
      .map(async (n) => [n, await value(n)] as const)));
  const questions = await page.getByRole("region", { name: "Questions" }).getByRole("listitem").allTextContents();
  const draft = await page.getByText("Draft · not confirmed").isVisible();

  // Rules that hold for every card, whatever the AI said.
  const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).sort().join("|");
  const sinhalaOk = nums(fields.instructions_en) === nums(fields.instructions_si);
  if (!sinhalaOk) expect(draft, "Sinhala numbers differ, so the card must be a draft").toBe(true);
  expect(draft, "Draft badge matches open must-answer questions").toBe(questions.some((q) => q.includes("Must answer")));
  await expect(page.getByText(chat.split("\n")[0], { exact: false })).toBeVisible(); // customer's words untouched

  console.log(`AI-FILL ${JSON.stringify({ fields, questions: questions.map((q) => q.replace(/Save answer|Clear answer/g, "").trim()), draft, sinhalaOk })}`);
  return { fields, questions, draft };
}

test("1. a complete Singlish order fills cleanly and is ready", async ({ page }) => {
  const chat = `Hi akke, mata wedding ring ekak ona. 22K gold, size 12.\nEthule "S & K" kiyala engrave karanna. Plain band ekak.`;
  const r = await fill(page, await card(chat), chat);
  expect(r.fields.purity).toContain("22K");
  expect(r.fields.size).toContain("12");
  expect(r.fields.engraving).toBe("S & K");
  expect(r.draft).toBe(false);
});

test("2. a missing size keeps the card a draft", async ({ page }) => {
  const chat = `Bracelet ekak ona 18K white gold. "Nimmi" kiyala engrave karanna puluwanda?`;
  const r = await fill(page, await card(chat), chat);
  expect(r.fields.purity).toContain("18K");
  expect(r.fields.engraving).toBe("Nimmi");
  expect(r.draft).toBe(true);
  expect(r.questions.join(" ")).toMatch(/size/i);
});

test("3. an undecided purity blocks the card", async ({ page }) => {
  const chat = `Chain ekak ona, length 20 inches. 22K da 24K da kiyala mama thama hithuwe na, amma ahala kiyannam.`;
  const r = await fill(page, await card(chat), chat);
  expect(r.draft).toBe(true);
  expect(r.questions.some((q) => q.includes("Must answer") && /purity|22K|24K|karat/i.test(q))).toBe(true);
});

test("4. an order written in Sinhala script is understood", async ({ page }) => {
  const chat = `මට රන් මාලයක් ඕනේ. 22K. දිග අඟල් 20. ඇතුළේ "Ruwan" කියලා ලියන්න.`;
  const r = await fill(page, await card(chat), chat);
  expect(r.fields.purity).toContain("22K");
  expect(`${r.fields.size} ${r.fields.design} ${r.fields.instructions_en}`).toContain("20");
  expect(r.fields.engraving).toBe("Ruwan");
});

test("5. a detail staff typed is never overwritten", async ({ page }) => {
  const chat = `Pendant chain ekak 22K, 18 inches. Design eka box chain ekak wage.`;
  const id = await card(chat, { fields: { design: "Rope chain" }, edited: ["design"] });
  const r = await fill(page, id, chat);
  expect(r.fields.design).toBe("Rope chain");
  expect(r.fields.purity).toContain("22K");
});
