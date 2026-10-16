import { selectionMessage } from "./whatsapp";

// Opens the staff member's email app with the message ready (no email service needed).
export function buildEmailLink(email: string, url: string, firstName: string): string {
  const subject = encodeURIComponent("Your selection from Christina Jewellers");
  const body = encodeURIComponent(selectionMessage(firstName, url));
  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

export function normaliseEmail(input: string): string | null {
  const v = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
