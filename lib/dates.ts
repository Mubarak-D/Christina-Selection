// One date style everywhere: "24 Dec 2026", in Sri Lanka time.
// Date-only values ("2026-12-24", e.g. deadlines) are calendar dates and shown as written;
// timestamps are converted to Asia/Colombo.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function format(value: string, opts: Intl.DateTimeFormatOptions) {
  const dateOnly = DATE_ONLY.test(value);
  const d = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  return d.toLocaleDateString("en-GB", { ...opts, timeZone: dateOnly ? "UTC" : "Asia/Colombo" });
}

export const formatDate = (value: string | null) =>
  value ? format(value, { day: "numeric", month: "short", year: "numeric" }) : "-";

export const formatShortDate = (value: string | null) =>
  value ? format(value, { day: "numeric", month: "short" }) : "-";
