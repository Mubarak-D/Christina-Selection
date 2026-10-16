import { test, expect } from "@playwright/test";
import { service, STAFF_STATE } from "./helpers";

test.use({ storageState: STAFF_STATE });

const tag = `${Date.now()}`;
const names = { chose: `Chose ${tag}`, quiet: `Quiet ${tag}`, due: `Deadline ${tag}` };
const created: string[] = [];
let newChoiceSet: string;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const inDays = (days: number) => {
  const d = new Date(Date.now() + 5.5 * 3_600_000); // Colombo date
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async () => {
  const db = service();
  const { data: cs } = await db.from("customers").insert([
    { name: names.chose, phone: `+9472${tag.slice(-7)}` },
    { name: names.quiet, phone: `+9473${tag.slice(-7)}` },
    { name: names.due, phone: `+9474${tag.slice(-7)}`, deadline: inDays(5) },
  ]).select();
  created.push(...cs!.map((c) => c.id));
  const id = (n: string) => cs!.find((c) => c.name === n)!.id;
  const { data: sets } = await db.from("selection_sets").insert([
    { customer_id: id(names.chose), title: "Rings", sent_at: daysAgo(1), submitted_at: daysAgo(0) },
    { customer_id: id(names.quiet), title: "Chains", sent_at: daysAgo(4) },
  ]).select();
  newChoiceSet = sets!.find((s) => s.title === "Rings")!.id;
});

test.afterAll(async () => {
  await service().from("customers").delete().in("id", created);
});

test("dashboard shows each kind of alert, and a seen choice drops off", async ({ page }) => {
  await page.goto("/");
  const section = (name: string) => page.getByRole("region", { name });
  await expect(section("Customer choices").getByText(names.chose)).toBeVisible();
  await expect(section("No reply yet").getByText(names.quiet)).toBeVisible();
  await expect(section("Coming up").getByText(names.due)).toBeVisible();
  await expect(page.getByRole("link", { name: /Dashboard \(\d+ new\)/ })).toBeVisible();

  await section("Customer choices").getByRole("link", { name: new RegExp(names.chose) }).click();
  await expect(page).toHaveURL(new RegExp(`/sets/${newChoiceSet}$`));

  // After opening it, the choice stays until handled, just without the New tag.
  await page.goto("/");
  const row = section("Customer choices").getByRole("link", { name: new RegExp(names.chose) });
  await expect(row).toBeVisible();
  await expect(row.getByText("New", { exact: true })).toHaveCount(0);
  await page.goto(`/sets/${newChoiceSet}`);
  await page.getByRole("button", { name: "Mark handled" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page.goto("/");
  await expect(section("Customer choices").getByText(names.chose)).toHaveCount(0);
});
