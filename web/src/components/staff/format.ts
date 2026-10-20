import type { Tone } from "@/components/ui/primitives";

/** Formatting helpers shared by the Tier 4 (school / staff) consoles. API payloads are loosely typed. */

export type Row = Record<string, unknown>;

export function str(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length > 0 ? s : fallback;
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function int(v: unknown, fallback = "—"): string {
  const n = num(v);
  return n === null ? fallback : Math.round(n).toLocaleString("en-GB");
}

export function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v: unknown, fallback = "—"): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

export function fmtDateTime(v: unknown, fallback = "—"): string {
  const d = toDate(v);
  return d
    ? `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : fallback;
}

/** Money from pence, e.g. 143964 → "£1,439.64". */
export function gbp(pence: unknown, fallback = "—"): string {
  const n = num(pence);
  if (n === null) return fallback;
  return `£${(n / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Fraction (0–1) as a percentage. */
export function pct(fraction: unknown, digits = 1, fallback = "—"): string {
  const n = num(fraction);
  return n === null ? fallback : `${(n * 100).toFixed(digits)}%`;
}

export function shortId(v: unknown): string {
  const s = str(v, "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "—";
}

const ACRONYMS = new Set(["QC", "AI", "DPA", "SLA", "DSL", "PII", "MIS", "SSO", "KCSIE", "GCSE", "LADO", "CSV", "ID", "OK"]);

/** "PENDING_QC" → "Pending QC". */
export function humanise(v: unknown, fallback = "—"): string {
  const s = str(v, "");
  if (!s) return fallback;
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w, i) => {
      const up = w.toUpperCase();
      if (ACRONYMS.has(up)) return up;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}

const TONE_BY_STATUS: Record<string, Tone> = {
  // positive / done
  APPROVED: "success",
  LIVE: "success",
  PASSED: "success",
  RESOLVED: "success",
  CONFIRMED: "success",
  ADJUSTED: "success",
  SIGNED: "success",
  PAID: "success",
  DONE: "success",
  READY: "success",
  COMPLETED: "success",
  ACTIVE: "success",
  PUBLISHED: "success",
  VALID: "success",
  GREEN: "success",
  OK: "success",
  OFFICIAL_TEACHING_USE: "success",
  BOARD_LICENSED: "success",
  OWN: "success",
  // in flight / needs attention
  PENDING_QC: "warning",
  IN_PROGRESS: "warning",
  CLAIMED: "warning",
  EVALUATING: "warning",
  NEEDS_REVIEW: "warning",
  SEGMENTING: "warning",
  EXTRACTING_SCHEME: "warning",
  TAGGING: "warning",
  EMBEDDING: "warning",
  AMBER: "warning",
  SENT: "warning",
  TRIALING: "warning",
  PENDING_BOARD_CONFIRMATION: "warning",
  TRIAGED: "warning",
  ACTIONED: "warning",
  OPEN: "warning",
  MEDIUM: "warning",
  SOLVER_PENDING: "warning",
  // problems
  QC_FAILED: "danger",
  REJECTED: "danger",
  FAILED: "danger",
  ERROR: "danger",
  RED: "danger",
  ESCALATED: "danger",
  HIGH: "danger",
  CRITICAL: "danger",
  SEVERE: "danger",
  RESTRICTED: "danger",
  SUSPENDED: "danger",
  BLOCKED: "danger",
  OVERDUE: "danger",
  // informational
  NEW: "info",
  QUEUED: "info",
  DRAFT: "info",
  REFERRED: "info",
  PLANNED: "info",
  UPLOADED: "info",
  VALIDATED: "info",
  LOW: "info",
  // closed / inactive
  RETIRED: "neutral",
  DISMISSED: "neutral",
  CLOSED: "neutral",
  NOT_STARTED: "neutral",
  NOT_SENT: "neutral",
  UNKNOWN: "neutral",
  TODO: "neutral",
};

export function toneFor(status: unknown): Tone {
  return TONE_BY_STATUS[str(status, "").toUpperCase()] ?? "neutral";
}

/** SLA label from a due timestamp. */
export function slaInfo(due: unknown, now: number = Date.now()): { label: string; tone: Tone } {
  const d = toDate(due);
  if (!d) return { label: "No SLA", tone: "neutral" };
  const hours = Math.round((d.getTime() - now) / 36e5);
  if (hours < 0) return { label: `Overdue by ${Math.abs(hours)}h`, tone: "danger" };
  if (hours < 12) return { label: `Due in ${hours}h`, tone: "warning" };
  if (hours < 48) return { label: `Due in ${hours}h`, tone: "success" };
  return { label: `Due in ${Math.round(hours / 24)}d`, tone: "success" };
}

/** Parses a JSON string column (e.g. marking points) without throwing. */
export function parseJson(v: unknown): unknown {
  if (typeof v !== "string") return v ?? null;
  try {
    return JSON.parse(v) as unknown;
  } catch {
    return null;
  }
}

export function isRecord(v: unknown): v is Row {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Best human text for a marking point / check item of unknown shape. */
export function pointText(p: unknown): string {
  if (typeof p === "string") return p;
  if (!isRecord(p)) return str(p);
  const keys = ["text", "point", "description", "criterion", "label", "statement", "name", "id"];
  for (const k of keys) {
    if (typeof p[k] === "string" && (p[k] as string).trim()) return p[k] as string;
  }
  return "Marking point";
}

export function pointMarks(p: unknown): number | null {
  if (!isRecord(p)) return null;
  return num(p.marks ?? p.mark ?? p.value ?? p.awarded);
}
