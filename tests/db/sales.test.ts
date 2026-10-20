import { afterAll, describe, expect, test } from "vitest";
import { anon, service, cleanup } from "./helpers";

const db = () => service();
const made: { customers: string[]; pieces: string[] } = { customers: [], pieces: [] };
afterAll(() => cleanup(made));

async function seed() {
  // Each id is recorded as soon as it exists, so a timeout mid-seed can't leave rows behind.
  const { data: c } = await db().from("customers").insert({ name: "TEST sales", phone: `+9476${Date.now() % 1e7}` }).select().single();
  made.customers.push(c!.id);
  const { data: p } = await db().from("pieces").insert({ title: "TEST sold ring", price: 1500 }).select().single();
  made.pieces.push(p!.id);
  const { data: s } = await db().from("selection_sets").insert({ customer_id: c!.id }).select().single();
  return { customerId: c!.id, pieceId: p!.id, setId: s!.id };
}

describe("sales", () => {
  test("a sale keeps its title and price even after the piece and set are deleted", async () => {
    const { customerId, pieceId, setId } = await seed();
    const { data: sale, error } = await db().from("sales")
      .insert({ customer_id: customerId, set_id: setId, piece_id: pieceId, title: "TEST sold ring", price: 1500 })
      .select().single();
    expect(error).toBeNull();
    expect(sale!.sold_at).not.toBeNull();

    await db().from("selection_sets").delete().eq("id", setId);
    await db().from("pieces").delete().eq("id", pieceId);
    const { data: after } = await db().from("sales").select().eq("id", sale!.id).single();
    expect(after).toMatchObject({ title: "TEST sold ring", price: 1500, set_id: null, piece_id: null });
  });

  test("anon can't read or write sales", async () => {
    const { customerId } = await seed();
    expect((await anon().from("sales").select()).data ?? []).toEqual([]);
    const ins = await anon().from("sales").insert({ customer_id: customerId, title: "x" });
    expect(ins.error).not.toBeNull();
  });
});

describe("mark_handled", () => {
  // Signed in as the e2e staff user is not available here, so call as service (RLS bypass is fine:
  // the function's logic is what's under test; staff-only access is covered by the RLS tests).
  test("records the chosen pieces once, even if pressed twice", async () => {
    const { customerId, pieceId, setId } = await seed();
    await db().from("set_items").insert({ set_id: setId, piece_id: pieceId });
    const first = await db().rpc("mark_handled", { p_set_id: setId, p_sold: [pieceId] });
    const second = await db().rpc("mark_handled", { p_set_id: setId, p_sold: [pieceId] });
    expect(first.data).toBe(1);
    expect(second.data).toBe(-1); // already handled: nothing recorded
    const { data } = await db().from("sales").select("title").eq("customer_id", customerId);
    expect(data).toHaveLength(1);
  });

  test("handling again after reopen replaces the set's sales instead of adding", async () => {
    const { customerId, pieceId, setId } = await seed();
    await db().from("set_items").insert({ set_id: setId, piece_id: pieceId });
    await db().rpc("mark_handled", { p_set_id: setId, p_sold: [pieceId] });
    await db().from("selection_sets").update({ handled_at: null }).eq("id", setId); // Reopen
    expect((await db().rpc("mark_handled", { p_set_id: setId, p_sold: [] })).data).toBe(0);
    expect((await db().from("sales").select("id").eq("customer_id", customerId)).data).toEqual([]);
  });

  test("ignores pieces that aren't in the set", async () => {
    const { pieceId, setId } = await seed(); // piece not added to the set
    expect((await db().rpc("mark_handled", { p_set_id: setId, p_sold: [pieceId] })).data).toBe(0);
  });
});
