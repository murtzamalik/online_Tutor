import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { DocumentTitle } from "./DocumentTitle";

/* ---------------------------------------------------------------- Card (§7.3) */

export function Card({ className, interactive, ...props }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-lg border border-neutral-200 bg-white",
        interactive && "transition-shadow duration-fast hover:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mt-0.5 text-caption text-neutral-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("px-5 py-4", className)} {...props} />;
}

/* ---------------------------------------------------------------- Page header */

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  docTitle,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Browser tab title; defaults to `title` when it is plain text. */
  docTitle?: string | null;
}) {
  const tabTitle = docTitle ?? (typeof title === "string" || typeof title === "number" ? String(title) : null);
  return (
    <header className={cx("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <DocumentTitle title={tabTitle} />
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-teal">{eyebrow}</p>}
        <h1 className="text-h1 text-neutral-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-neutral-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------------------------------------------------------------- Badge */

export type Tone = "neutral" | "brand" | "teal" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  brand: "bg-brand-navySoft text-brand-navy",
  teal: "bg-brand-tealSoft text-brand-teal",
  success: "bg-[#E7F4EC] text-answer-correct",
  warning: "bg-[#FBF3DF] text-[#8A6508]",
  danger: "bg-[#FBE9E7] text-answer-incorrect",
  info: "bg-[#E8F1FB] text-[#1D5FA8]",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Callout */

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const border: Record<Tone, string> = {
    neutral: "border-neutral-200",
    brand: "border-brand-navy/30",
    teal: "border-brand-teal/30",
    success: "border-answer-correct/30",
    warning: "border-answer-partial/40",
    danger: "border-answer-incorrect/30",
    info: "border-[#1D5FA8]/25",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-lg border px-4 py-3", tones[tone], border[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx("text-[14px]", title ? "mt-0.5" : undefined)}>{children}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Form fields */

const fieldBase =
  "sl-field block w-full rounded-md border border-neutral-200 bg-white px-3 text-[15px] text-neutral-900 shadow-soft " +
  "placeholder:text-neutral-400 transition-colors duration-fast focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/15 " +
  "disabled:bg-neutral-050 disabled:text-neutral-400";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-neutral-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-answer-incorrect" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-caption text-neutral-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, "min-h-[120px] py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-2.5 text-[14px] text-neutral-700", className)}>
      <input type="checkbox" className="sl-check mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 accent-[var(--tier-accent)]" {...props} />
      <span>{label}</span>
    </label>
  );
}

/* ---------------------------------------------------------------- Stat tile */

export function StatTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx("p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
        {icon && <span className="text-neutral-400">{icon}</span>}
      </div>
      <p className="tabular mt-2 text-[24px] font-semibold leading-none text-neutral-900">{value}</p>
      {hint && <p className="mt-1.5 text-caption text-neutral-600">{hint}</p>}
    </Card>
  );
}

/* ---------------------------------------------------------------- Mastery (§4.2, §7.5) */

export const MASTERY = [
  { level: 0, label: "Just getting started", color: "#D9D9D9" },
  { level: 1, label: "Building", color: "#F6C453" },
  { level: 2, label: "Secure", color: "#8FBF6B" },
  { level: 3, label: "Mastered", color: "#1F7A63" },
] as const;

/** Same bands as the BKT engine (BktEngine.masteryLevelFromP). */
export function masteryLevel(p: number | null | undefined): number {
  if (p == null || Number.isNaN(p)) return 0;
  if (p < 0.35) return 0;
  if (p < 0.55) return 1;
  if (p < 0.75) return 2;
  return 3;
}

export function MasteryRing({ value, size = 40, label }: { value: number | null | undefined; size?: number; label?: string }) {
  const p = Math.max(0, Math.min(1, value ?? 0));
  const lvl = MASTERY[masteryLevel(value)];
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-2" title={`${lvl.label} · ${Math.round(p * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? "Mastery"}: ${lvl.label}, ${Math.round(p * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={lvl.color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 600ms ease-in-out" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="tabular" fontSize={size * 0.28} fontWeight={600} fill="#1A1A1A">
          {Math.round(p * 100)}
        </text>
      </svg>
    </span>
  );
}

export function MasteryBadge({ value }: { value: number | null | undefined }) {
  const lvl = MASTERY[masteryLevel(value)];
  return (
    <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-neutral-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: lvl.color }} />
      {lvl.label}
    </span>
  );
}

/* ---------------------------------------------------------------- Table */

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("overflow-x-auto rounded-lg border border-neutral-200 bg-white", className)}>
      <table className="w-full border-collapse text-left text-[14px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cx("border-b border-neutral-200 bg-neutral-050 px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-neutral-600", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("border-b border-neutral-100 px-4 py-3 align-middle text-neutral-900", className)}>{children}</td>;
}

/* ---------------------------------------------------------------- Description list */

export function KeyValue({ items, className }: { items: Array<[ReactNode, ReactNode]>; className?: string }) {
  return (
    <dl className={cx("divide-y divide-neutral-100", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-6 py-2.5">
          <dt className="text-[14px] text-neutral-600">{k}</dt>
          <dd className="text-right text-[14px] font-medium text-neutral-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
