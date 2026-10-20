"use client";

import { isRecord, parseJson, pointMarks, pointText, str } from "./format";

/** Labelled read-only text (question stem, pupil answer, model answer). */
export function TextBlock({ label, text, emptyText = "Not provided" }: { label: string; text: unknown; emptyText?: string }) {
  const value = str(text, "");
  return (
    <div>
      <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      {value ? (
        <p className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-050 px-3 py-2.5 text-[14px] leading-relaxed text-neutral-900">
          {value}
        </p>
      ) : (
        <p className="text-[14px] text-neutral-600">{emptyText}</p>
      )}
    </div>
  );
}

/** Renders a marking-points JSON column as a numbered list. */
export function MarkingPoints({ json, label = "Mark scheme" }: { json: unknown; label?: string }) {
  const parsed = parseJson(json);
  const points: unknown[] = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.points)
      ? (parsed.points as unknown[])
      : [];
  return (
    <div>
      <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      {points.length === 0 ? (
        <p className="text-[14px] text-neutral-600">No marking points recorded for this question.</p>
      ) : (
        <ol className="space-y-1.5">
          {points.map((p, i) => {
            const m = pointMarks(p);
            return (
              <li key={i} className="flex items-start gap-2.5 text-[14px]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-semibold tabular text-neutral-700">
                  {i + 1}
                </span>
                <span className="flex-1 text-neutral-900">{pointText(p)}</span>
                {m !== null && <span className="shrink-0 text-caption font-semibold tabular text-neutral-600">{m}m</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
