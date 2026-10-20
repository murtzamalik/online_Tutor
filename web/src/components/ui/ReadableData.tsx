import React from "react";

/** Renders API payloads as readable lists/tables — never raw JSON for end users. */

function labelize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatScalar(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const trimmed = v.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return formatScalar(JSON.parse(trimmed));
      } catch {
        return v;
      }
    }
    return v;
  }
  return String(v);
}

function ObjectRows({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return <p className="text-sm text-ink/60">Nothing to show yet.</p>;
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-md border border-mist/80 bg-white/60 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/50">{labelize(k)}</dt>
          <dd className="mt-1 text-sm text-ink">
            {isPlainObject(v) || Array.isArray(v) ? <ReadableData value={v} compact /> : formatScalar(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ArrayTable({ items }: { items: unknown[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink/60">No items yet.</p>;
  }
  const objects = items.every(isPlainObject);
  if (!objects) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item, i) => (
          <li key={i}>{isPlainObject(item) || Array.isArray(item) ? <ReadableData value={item} compact /> : formatScalar(item)}</li>
        ))}
      </ul>
    );
  }
  const keys = Array.from(
    items.reduce((set, row) => {
      Object.keys(row as Record<string, unknown>).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ).slice(0, 8);

  return (
    <div className="overflow-x-auto rounded-md border border-mist bg-white/70">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-mist bg-paper/80 text-xs uppercase tracking-wide text-ink/60">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 font-semibold">
                {labelize(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-b border-mist/60 last:border-0">
              {keys.map((k) => {
                const cell = (row as Record<string, unknown>)[k];
                return (
                  <td key={k} className="px-3 py-2 align-top text-ink/90">
                    {isPlainObject(cell) || Array.isArray(cell) ? (
                      <span className="text-ink/70">{Array.isArray(cell) ? `${cell.length} items` : "Details"}</span>
                    ) : (
                      formatScalar(cell)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReadableData({
  value,
  compact = false,
  title,
}: {
  value: unknown;
  compact?: boolean;
  title?: string;
}) {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }

  const body = (() => {
    if (parsed == null) return <p className="text-sm text-ink/60">Nothing to show yet.</p>;
    if (Array.isArray(parsed)) return <ArrayTable items={parsed} />;
    if (isPlainObject(parsed)) return <ObjectRows value={parsed} />;
    return <p className="text-sm text-ink">{formatScalar(parsed)}</p>;
  })();

  if (compact) return <div className="space-y-2">{body}</div>;

  return (
    <div className="animate-rise space-y-3 rounded-md border border-mist bg-white/70 p-4" aria-live="polite">
      {title && <h2 className="font-display text-xl text-ink">{title}</h2>}
      {body}
    </div>
  );
}

export function formatPence(pence: number | null | undefined, currency = "GBP"): string {
  if (pence == null || Number.isNaN(pence)) return "—";
  const amount = pence / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
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
