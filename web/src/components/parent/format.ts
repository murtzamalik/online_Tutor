import { ApiError } from "@/lib/api/client";

/** Money from pence, en-GB. "—" for missing values. */
export function formatPence(pence: unknown, currency = "GBP"): string {
  const n = typeof pence === "number" ? pence : typeof pence === "string" && pence.trim() !== "" ? Number(pence) : NaN;
  if (Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP" }).format(n / 100);
  } catch {
    return `£${(n / 100).toFixed(2)}`;
  }
}

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" || typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "14 Mar 2026" */
export function formatDate(value: unknown, fallback = "—"): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

/** "14 Mar 2026, 16:05" */
export function formatDateTime(value: unknown, fallback = "—"): string {
  const d = toDate(value);
  return d
    ? `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : fallback;
}

/** "3 days ago" style relative label, falling back to a date after a week. */
export function formatRelative(value: unknown, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  const diffMs = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diffMs < 0) return formatDate(d);
  if (diffMs < 60 * 60 * 1000) return "Just now";
  if (diffMs < day) return "Today";
  if (diffMs < 2 * day) return "Yesterday";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  return formatDate(d);
}

/** COOLING_OFF → "Cooling off" */
export function humanise(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  const s = String(value).replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message && err.message !== "Response schema mismatch") return err.message;
  return fallback;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value);
  return s === "" ? undefined : s;
}

export function num(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}
