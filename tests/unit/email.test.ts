import { expect, test } from "vitest";
import { buildEmailLink, normaliseEmail } from "@/lib/email";

test("builds a mailto link with subject and message", () => {
  const link = buildEmailLink("ana@example.test", "https://x.test/s/abc", "Ana");
  const [to, query] = link.replace("mailto:", "").split("?");
  const q = new URLSearchParams(query.replace(/%20/g, "+"));
  expect(to).toBe("ana%40example.test");
  expect(q.get("subject")).toBe("Your selection from Christina Jewellers");
  expect(q.get("body")).toBe(
    "Hi Ana, here are the pieces from Christina Jewellers you asked to see. " +
    "Tap to choose your favourites: https://x.test/s/abc");
});

test.each([
  ["  Ana@Example.TEST ", "ana@example.test"],
  ["not-an-email", null],
  ["", null],
])("normaliseEmail(%j) → %j", (input, out) => expect(normaliseEmail(input)).toBe(out));
