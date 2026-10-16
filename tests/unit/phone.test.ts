import { describe, expect, test } from "vitest";
import { normalisePhone, phoneSearchDigits } from "@/lib/phone";

describe("normalisePhone (UK, cc 44)", () => {
  test.each([
    ["07700 900123", "+447700900123"],
    ["+44 (7700) 900-123", "+447700900123"],
    ["0044 7700 900123", "+447700900123"],
  ])("%s → %s", (input, out) => expect(normalisePhone(input, "44")).toBe(out));

  test.each(["12", "abc", ""])("%s is rejected", (input) => expect(normalisePhone(input, "44")).toBeNull());
});

describe("normalisePhone (Sri Lanka default)", () => {
  test.each([
    ["077 123 4567", "+94771234567"],
    ["+94 77 123 4567", "+94771234567"],
    ["0094 77 123 4567", "+94771234567"],
    ["77 123 4567", "+94771234567"],
    ["94771234567", "+94771234567"], // country code typed without +
    ["+94 (0)77 123 4567", "+94771234567"], // trunk 0 written after the country code
    ["0094 077 123 4567", "+94771234567"],
  ])("%s → %s", (input, out) => expect(normalisePhone(input)).toBe(out));
});

describe("phoneSearchDigits", () => {
  test.each([
    ["077 123 4567", "771234567"],
    ["0771234567", "771234567"],
    ["+94 77 123 4567", "771234567"],
    ["4567", "4567"],
    ["Nadia", null],
  ])("%s → %s", (input, out) => expect(phoneSearchDigits(input)).toBe(out));
});
