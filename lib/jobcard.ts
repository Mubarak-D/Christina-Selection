// Job card rules, kept pure so they can be tested and shared by the pages and the AI fill.

export const FIELDS = [
  ["item", "Item"], ["metal", "Metal"], ["purity", "Purity"], ["size", "Size"], ["weight", "Weight"],
  ["stones", "Stones"], ["engraving", "Engraving"], ["finish", "Finish"], ["design", "Design"],
] as const;
export const REQUIRED = ["item", "metal", "purity", "size"];
const label = (key: string) => FIELDS.find(([k]) => k === key)?.[1] ?? key;

export type Question = {
  id: string;
  field?: string;           // the field an answer fills, if any
  text: string;
  level: "must" | "check";  // must = card stays DRAFT until answered
  answer?: string;
  prev?: string;            // field value before the answer, restored if the answer is cleared
};
export type Change = { field: string; old: string; new: string; at: string };
export type JobCard = {
  fields: Record<string, string>;
  edited: string[];
  questions: Question[];
  revision: number;
  printed_at: string | null;
  changes: Change[];
  instructions_en?: string[];
  instructions_si?: string[];
};
export type Fill = {
  fields: Record<string, string>;
  questions: Omit<Question, "id" | "answer" | "prev">[];
  instructions_en: string[];
  instructions_si: string[];
};

const isOpen = (q: Question) => !q.answer;

// Open must questions, plus one for each required field that is empty and not already asked about.
export function openMust(card: JobCard): Question[] {
  const open = card.questions.filter((q) => q.level === "must" && isOpen(q));
  const missing = REQUIRED
    .filter((f) => !card.fields[f]?.trim() && !open.some((q) => q.field === f))
    .map((f): Question => ({ id: `missing:${f}`, field: f, text: `${label(f)} not given`, level: "must" }));
  return [...open, ...missing];
}
export const isDraft = (card: JobCard) => openMust(card).length > 0;

// Set a field. After the card has been printed, the first edit since that print bumps the revision
// and every edit is kept in changes. Callers stamp printed_at on each print.
export function recordChange(card: JobCard, field: string, value: string, at: string, byPerson = true): JobCard {
  const old = card.fields[field] ?? "";
  const edited = byPerson && !card.edited.includes(field) ? [...card.edited, field] : card.edited;
  if (old === value) return { ...card, edited };
  const next = { ...card, edited, fields: { ...card.fields, [field]: value } };
  if (!card.printed_at) return next;
  const printed = card.printed_at;
  const bump = !card.changes.some((c) => c.at > printed);
  return { ...next, revision: card.revision + (bump ? 1 : 0), changes: [...card.changes, { field, old, new: value, at }] };
}

export function applyAnswer(card: JobCard, questionId: string, answer: string, at: string): JobCard {
  const q = card.questions.find((x) => x.id === questionId);
  if (!q) return card;
  const value = answer.trim();
  const updated: Question = value
    ? { ...q, answer: value, prev: q.prev ?? card.fields[q.field ?? ""] ?? "" }
    : { ...q, answer: undefined, prev: undefined };
  const next = { ...card, questions: card.questions.map((x) => (x.id === questionId ? updated : x)) };
  return q.field ? recordChange(next, q.field, value || (q.prev ?? ""), at) : next;
}

// Apply an AI fill: never touches fields a person edited, keeps answered questions,
// and replaces open ones with the fill's (except questions about fields a person already set).
export function mergeFill(card: JobCard, fill: Fill, at: string): JobCard {
  let next = card;
  for (const [field, value] of Object.entries(fill.fields)) {
    if (value?.trim() && !card.edited.includes(field)) next = recordChange(next, field, value.trim(), at, false);
  }
  const fresh = fill.questions
    .filter((q) => !(q.field && card.edited.includes(q.field)))
    .map((q): Question => ({ ...q, id: crypto.randomUUID() }));
  return {
    ...next,
    questions: [...card.questions.filter((q) => !isOpen(q)), ...fresh],
    instructions_en: fill.instructions_en,
    instructions_si: fill.instructions_si,
  };
}

// WhatsApp read-back: what we have confirmed, then what is still open.
export function readBackMessage(card: JobCard, firstName: string): string {
  const details = FIELDS.filter(([k]) => card.fields[k]?.trim()).map(([k, l]) => `• ${l}: ${card.fields[k]}`);
  const open = [...card.questions.filter(isOpen), ...openMust(card).filter((q) => q.id.startsWith("missing:"))];
  const lines = [`Hi ${firstName}, here are the details of your order with Christina Jewellers:`, ...details];
  if (open.length) lines.push("", "Please confirm:", ...open.map((q, i) => `${i + 1}. ${q.text}`));
  lines.push("", "Reply here if anything needs changing.");
  return lines.join("\n");
}

// Numbers (purity, sizes, weights) and the engraving must appear unchanged in the Sinhala lines.
export function numbersPreserved(en: string[], si: string[], engraving?: string): boolean {
  const nums = (lines: string[]) => (lines.join(" ").match(/\d+(?:[.,]\d+)?/g) ?? []).sort().join("|");
  if (nums(en) !== nums(si)) return false;
  return !engraving?.trim() || si.join(" ").includes(engraving.trim());
}
