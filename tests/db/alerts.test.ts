import { afterAll, describe, expect, test } from "vitest";
import { service, cleanup } from "./helpers";

const db = () => service();
const created: string[] = [];
afterAll(() => cleanup({ customers: created }));

// Alert dates are Sri Lanka dates.
// "Today" in Colombo (UTC+5:30), matching the alerts view.
const dayOffset = (days: number, yearsBack = 0) => {
  const d = new Date(Date.now() + 5.5 * 3_600_000);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCFullYear(d.getUTCFullYear() - yearsBack);
  return d.toISOString().slice(0, 10);
};
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

async function customer(extra: Record<string, unknown> = {}) {
  const { data, error } = await db().from("customers")
    .insert({ name: "TEST alerts", phone: `+9471${Math.floor(Math.random() * 1e7)}`, ...extra })
    .select().single();
  expect(error).toBeNull();
  created.push(data!.id);
  return data!.id as string;
}
async function setFor(customerId: string, fields: Record<string, unknown>) {
  const { data } = await db().from("selection_sets").insert({ customer_id: customerId, ...fields }).select().single();
  return data!.id as string;
}
const alertsFor = async (customerId: string) =>
  (await db().from("alerts").select().eq("customer_id", customerId)).data!;

describe("next_occurrence", () => {
  const next = async (d: string, today: string) =>
    (await db().rpc("next_occurrence", { d, today })).data;

  test("Feb 29 falls on Feb 28 in a non-leap year", async () => {
    expect(await next("2000-02-29", "2027-02-01")).toBe("2027-02-28");
  });
  test("wraps across New Year", async () => {
    expect(await next("1990-01-02", "2026-12-28")).toBe("2027-01-02");
  });
  test("today counts", async () => {
    expect(await next("1990-10-16", "2026-10-16")).toBe("2026-10-16");
  });
});

describe("alerts view", () => {
  test("new choice: submitted and unseen", async () => {
    const c = await customer();
    const s = await setFor(c, { sent_at: ago(1), submitted_at: ago(0) });
    expect(await alertsFor(c)).toMatchObject([{ kind: "new_choice", set_id: s, customer_name: "TEST alerts" }]);
  });

  test("handled or seen sets are not new choices", async () => {
    const c = await customer();
    await setFor(c, { sent_at: ago(1), submitted_at: ago(0), handled_at: ago(0) });
    await setFor(c, { sent_at: ago(1), submitted_at: ago(0), seen_at: ago(0) });
    expect(await alertsFor(c)).toEqual([]);
  });

  test("no reply after 3 days, not before", async () => {
    const c = await customer();
    const old = await setFor(c, { sent_at: ago(4) });
    await setFor(c, { sent_at: ago(2) });
    expect(await alertsFor(c)).toMatchObject([{ kind: "no_reply", set_id: old }]);
  });

  test("a handled set is not 'no reply' even if the customer never used the link", async () => {
    const c = await customer();
    await setFor(c, { sent_at: ago(5), handled_at: ago(1) });
    expect(await alertsFor(c)).toEqual([]);
  });

  test("dates are Sri Lanka dates (UTC+5:30)", async () => {
    const c = await customer();
    // 19:30 UTC on 16 Oct is 01:00 on 17 Oct in Colombo.
    await setFor(c, { sent_at: "2026-10-15T10:00:00Z", submitted_at: "2026-10-16T19:30:00Z" });
    expect(await alertsFor(c)).toMatchObject([{ kind: "new_choice", due: "2026-10-17" }]);
  });

  test("birthday within 7 days", async () => {
    const c = await customer({ birthday: dayOffset(5, 30) });
    expect(await alertsFor(c)).toMatchObject([{ kind: "upcoming_date", label: "Birthday", due: dayOffset(5) }]);
  });

  test("anniversary beyond 7 days is not shown", async () => {
    const c = await customer({ anniversary: dayOffset(10, 3) });
    expect(await alertsFor(c)).toEqual([]);
  });
});
