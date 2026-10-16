import { expect, test } from "vitest";
import { mediaPath } from "@/lib/media";

test("keeps a plain extension", () => {
  expect(mediaPath("p1", "Ring Photo.JPG")).toMatch(/^p1\/[0-9a-f-]{36}\.jpg$/);
});

test("strips anything path-like from the extension", () => {
  expect(mediaPath("p1", "evil./../../x")).toMatch(/^p1\/[0-9a-f-]{36}\.bin$/);
  expect(mediaPath("p1", "noext")).toMatch(/^p1\/[0-9a-f-]{36}\.bin$/);
});
