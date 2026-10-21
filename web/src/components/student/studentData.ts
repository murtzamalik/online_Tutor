import { ApiError } from "@/lib/api/client";

/** Shared, framework-free helpers for student screens (session keys, API error mapping, response parsing). */

export function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem("accessToken") ?? undefined;
}

export type LoadFailure = { kind: "error" | "forbidden" | "notFound"; message: string };

/** Maps any thrown value to a screen state: 403 → forbidden, everything else → error with a readable message. */
export function toFailure(err: unknown, fallback: string): LoadFailure {
  if (err instanceof ApiError && err.status === 403) {
    return { kind: "forbidden", message: err.message || fallback };
  }
  // A bad or stale link (unknown id, or not an id at all): nothing to retry.
  if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
    return { kind: "notFound", message: "We couldn't find that. It may have been removed, or the link is wrong." };
  }
  if (err instanceof ApiError) return { kind: "error", message: err.message || fallback };
  if (err instanceof Error && err.message) return { kind: "error", message: err.message };
  return { kind: "error", message: fallback };
}

export function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof Error) return err.message || fallback;
  return fallback;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parses a value that may be a JSON string or already-parsed JSON. */
export function parseJsonish(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return v;
  }
}

export function asArray(v: unknown): unknown[] {
  const parsed = parseJsonish(v);
  return Array.isArray(parsed) ? parsed : [];
}

export function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Accepts ISO strings or epoch millis (Spring may serialise timestamps either way). */
export function toDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = typeof v === "number" ? new Date(v) : typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function formatDate(v: unknown, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString("en-GB", opts) : "—";
}

export type McqOption = { key: string; text: string };

/** Options arrive as a parsed array from practice endpoints, or as a JSON string elsewhere. */
export function parseOptions(raw: unknown): McqOption[] {
  return asArray(raw)
    .map((o, i): McqOption | null => {
      if (isRecord(o)) {
        const key = str(o.key ?? o.id ?? o.optionId, String.fromCharCode(65 + i));
        const text = str(o.text ?? o.label ?? o.value, "");
        return { key, text };
      }
      if (typeof o === "string") return { key: String.fromCharCode(65 + i), text: o };
      return null;
    })
    .filter((o): o is McqOption => o !== null);
}

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  SHORT_ANSWER: "Short answer",
  CALCULATION: "Calculation",
  EXTENDED_WRITTEN: "Extended response",
  PRACTICAL_BASED: "Practical",
};

export function questionTypeLabel(t: unknown): string {
  const s = str(t);
  return QUESTION_TYPE_LABEL[s] ?? (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Question");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Topic row returned by GET /students/{id}/topics. */
export type StudentTopic = { topicId: number; topicName: string; topicNumber: string | null; mastery: number };

export function parseTopics(res: unknown): StudentTopic[] {
  const items = isRecord(res) ? asArray(res.items) : [];
  return items.filter(isRecord).map((t) => ({
    topicId: num(t.topicId) ?? 0,
    topicName: str(t.topicName, "Topic"),
    topicNumber: t.topicNumber == null ? null : str(t.topicNumber),
    mastery: num(t.mastery) ?? 0,
  }));
}
