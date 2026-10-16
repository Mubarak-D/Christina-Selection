import { expect, test } from "vitest";
import { formatDate, formatShortDate } from "@/lib/dates";

test("date-only values are shown as written", () => {
  expect(formatDate("2026-12-24")).toBe("24 Dec 2026");
  expect(formatShortDate("2026-12-24")).toBe("24 Dec");
});

test("timestamps are shown in Sri Lanka time", () => {
  // 19:30 UTC on 16 Oct is already 17 Oct in Colombo.
  expect(formatDate("2026-10-16T19:30:00Z")).toBe("17 Oct 2026");
});

test("missing values show a dash", () => {
  expect(formatDate(null)).toBe("-");
});
