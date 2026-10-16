import { expect, test } from "vitest";
import { buildWhatsAppLink } from "@/lib/whatsapp";

test("builds a wa.me link with the prefilled message", () => {
  const copy =
    "Hi Ana, here are the pieces from Christina Jewellers you asked to see. " +
    "Tap to choose your favourites: https://x.test/s/abc";
  expect(buildWhatsAppLink("+447700900123", "https://x.test/s/abc", "Ana"))
    .toBe(`https://wa.me/447700900123?text=${encodeURIComponent(copy)}`);
});
