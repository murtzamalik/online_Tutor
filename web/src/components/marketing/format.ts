/** Formatting helpers shared by the public/marketing and auth pages. */

export function formatPence(pence: number | null | undefined, currency = "GBP", wholePounds = false): string {
  if (pence == null || Number.isNaN(pence)) return "—";
  const amount = pence / 100;
  const opts: Intl.NumberFormatOptions = { style: "currency", currency };
  if (wholePounds && Number.isInteger(amount)) {
    opts.minimumFractionDigits = 0;
    opts.maximumFractionDigits = 0;
  }
  try {
    return new Intl.NumberFormat("en-GB", opts).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

export function cycleLabel(cycle: string | null | undefined): string {
  if (!cycle) return "";
  const c = cycle.toUpperCase();
  if (c === "MONTHLY") return "per month";
  if (c === "YEARLY" || c === "ANNUAL") return "per year";
  return cycle.toLowerCase();
}

/** Accepts ISO strings, "YYYY-MM-DD" dates and epoch millis (Jackson timestamps). */
export function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const s = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDate(value: unknown, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", opts) : "";
}

export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
}

/** "EXAM_PREP_PLUS" → "Exam prep plus". */
export function humanise(code: string | null | undefined): string {
  if (!code) return "";
  const s = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
