import { DEFAULT_COUNTRY_CODE } from "./config";

// Turns what staff type into E.164 ("+94771234567"), or null if it can't be a phone number.
export function normalisePhone(input: string, defaultCc = DEFAULT_COUNTRY_CODE): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = defaultCc + digits.slice(1);
  } else if (!(digits.startsWith(defaultCc) && digits.length - defaultCc.length >= 9)) {
    // ponytail: "starts with cc and has ≥9 more digits" means cc was typed without "+";
    // a national number that happens to start with the cc digits would be misread — use libphonenumber if that bites.
    digits = defaultCc + digits;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}
