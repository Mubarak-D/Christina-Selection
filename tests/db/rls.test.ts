import { describe, expect, test } from "vitest";
import { anon, service, cleanup } from "./helpers";

const tables = ["customers", "pieces", "piece_media", "selection_sets", "set_items"];

describe("RLS", () => {
  test("anon reads nothing", async () => {
    const db = service();
    const { data: c, error } = await db
      .from("customers").insert({ name: "TEST rls", phone: "+94770000001" }).select().single();
    expect(error).toBeNull();
    try {
      for (const t of tables) {
        const res = await anon().from(t).select();
        expect(res.error, t).toBeNull();
        expect(res.data, t).toEqual([]);
      }
    } finally {
      await cleanup({ customers: [c!.id] });
    }
  });

  test("anon cannot insert", async () => {
    const { error } = await anon().from("customers").insert({ name: "TEST anon", phone: "+94770000002" });
    expect(error).not.toBeNull();
  });

  test("media bucket is private", async () => {
    const { data, error } = await service().storage.getBucket("media");
    expect(error).toBeNull();
    expect(data!.public).toBe(false);
  });
});
