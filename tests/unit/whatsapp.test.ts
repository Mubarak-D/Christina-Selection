import { expect, test } from "vitest";
import { buildReadBackLink, buildWhatsAppLink } from "@/lib/whatsapp";

test("builds a wa.me link with the prefilled message", () => {
  const copy =
    "Hi Ana, here are the pieces from Christina Jewellers you asked to see. " +
    "Tap to choose your favourites: https://x.test/s/abc";
  expect(buildWhatsAppLink("+447700900123", "https://x.test/s/abc", "Ana"))
    .toBe(`https://wa.me/447700900123?text=${encodeURIComponent(copy)}`);
});

test("read-back link carries the job card message to the customer's number", () => {
  expect(buildReadBackLink("+94771234567", "Hi Nimal\n• Size: 14"))
    .toBe(`https://wa.me/94771234567?text=${encodeURIComponent("Hi Nimal\n• Size: 14")}`);
});
