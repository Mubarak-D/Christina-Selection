import { afterAll, describe, expect, test } from "vitest";
import { service } from "./helpers";

const tag = Date.now();
afterAll(async () => {
  await service().from("customers").delete().like("name", `TEST contact ${tag}%`);
});

describe("customer contact", () => {
  test("needs a WhatsApp number or an email", async () => {
    const { error } = await service().from("customers").insert({ name: `TEST contact ${tag} none` });
    expect(error?.code).toBe("23514");
  });

  test("email only is fine, with an optional deadline", async () => {
    const { error } = await service().from("customers")
      .insert({ name: `TEST contact ${tag} email`, email: `c${tag}@example.test`, deadline: "2026-12-24" });
    expect(error).toBeNull();
  });

  test("the same email twice is refused, whatever the capitals", async () => {
    const { error } = await service().from("customers")
      .insert({ name: `TEST contact ${tag} dup`, email: `C${tag}@Example.test` });
    expect(error?.code).toBe("23505");
  });
});
