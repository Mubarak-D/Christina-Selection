import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { anon, service, cleanup } from "./helpers";

let customerId: string, setId: string, token: string, A: string, B: string, C: string;

beforeEach(async () => {
  const db = service();
  const { data: c } = await db.from("customers")
    .insert({ name: "TEST submit", phone: `+9477${Date.now() % 10_000_000}` }).select().single();
  const { data: p } = await db.from("pieces")
    .insert([{ title: "TEST A" }, { title: "TEST B" }, { title: "TEST C" }]).select();
  const { data: s } = await db.from("selection_sets").insert({ customer_id: c!.id }).select().single();
  customerId = c!.id; setId = s!.id; token = s!.token;
  [A, B, C] = p!.map((x) => x.id);
  await db.from("set_items").insert([A, B, C].map((piece_id) => ({ set_id: setId, piece_id })));
});

afterEach(() => cleanup({ customers: [customerId], pieces: [A, B, C] }));

const submit = (chosen: string[], db = service()) =>
  db.rpc("submit_selection", { p_token: token, p_chosen: chosen });

async function statuses() {
  const { data } = await service().from("set_items").select("piece_id,status").eq("set_id", setId);
  return Object.fromEntries(data!.map((r) => [r.piece_id, r.status]));
}

const set = async () =>
  (await service().from("selection_sets").select().eq("id", setId).single()).data!;

describe("submit_selection", () => {
  test("token is 32 url-safe chars", () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  test("chooses 2 of 3", async () => {
    await service().from("selection_sets").update({ seen_at: new Date().toISOString() }).eq("id", setId);
    expect((await submit([A, B])).data).toBe("ok");
    expect(await statuses()).toEqual({ [A]: "chosen", [B]: "chosen", [C]: "dismissed" });
    const s = await set();
    expect(s.submitted_at).not.toBeNull();
    expect(s.seen_at).toBeNull();
  });

  test("resubmit changes choice", async () => {
    await submit([A, B]);
    expect((await submit([C])).data).toBe("ok");
    expect(await statuses()).toEqual({ [A]: "dismissed", [B]: "dismissed", [C]: "chosen" });
  });

  test("zero chosen dismisses all", async () => {
    expect((await submit([])).data).toBe("ok");
    expect(await statuses()).toEqual({ [A]: "dismissed", [B]: "dismissed", [C]: "dismissed" });
  });

  test("idempotent", async () => {
    expect((await submit([A])).data).toBe("ok");
    const first = await statuses();
    expect((await submit([A])).data).toBe("ok");
    expect(await statuses()).toEqual(first);
  });

  test("foreign id is rejected and nothing changes", async () => {
    expect((await submit([A, randomUUID()])).data).toBe("invalid");
    expect(await statuses()).toEqual({ [A]: "pending", [B]: "pending", [C]: "pending" });
    expect((await set()).submitted_at).toBeNull();
  });

  test("unknown token is invalid", async () => {
    const { data } = await service().rpc("submit_selection", { p_token: "nope", p_chosen: [A] });
    expect(data).toBe("invalid");
  });

  test("handled set is locked", async () => {
    await service().from("selection_sets").update({ handled_at: new Date().toISOString() }).eq("id", setId);
    expect((await submit([A])).data).toBe("locked");
    expect(await statuses()).toEqual({ [A]: "pending", [B]: "pending", [C]: "pending" });
  });

  test("anon can call it but still cannot read items", async () => {
    expect((await submit([A], anon())).data).toBe("ok");
    expect((await anon().from("set_items").select()).data).toEqual([]);
  });
});
