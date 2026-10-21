"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CaretRight, Check } from "@phosphor-icons/react";
import { cx } from "@/components/ui/cx";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/states";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { LoadFailure } from "./studentData";
import type { McqOption } from "./studentData";

/* ------------------------------------------------------------------ Failure view */

/** Renders a LoadFailure: 403 → ForbiddenState, otherwise ErrorState with an optional retry. */
export function FailureView({
  failure,
  onRetry,
  forbiddenBody,
  action,
}: {
  failure: LoadFailure;
  onRetry?: () => void;
  forbiddenBody?: string;
  action?: ReactNode;
}) {
  if (failure.kind === "forbidden") return <ForbiddenState body={forbiddenBody ?? failure.message} />;
  if (failure.kind === "notFound") {
    return <EmptyState title="Not found" body={failure.message} action={action ?? <ButtonLink href="/home" variant="secondary" size="sm">Go to Home</ButtonLink>} />;
  }
  return (
    <ErrorState
      body={failure.message}
      action={
        action ??
        (onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined)
      }
    />
  );
}

/* ------------------------------------------------------------------ Progress bar */

export function ProgressBar({
  value,
  max,
  label,
  className,
  tone = "brand",
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
  tone?: "brand" | "teal" | "white";
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cx("h-2 w-full overflow-hidden rounded-full", tone === "white" ? "bg-white/25" : "bg-neutral-100", className)}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-slow",
          tone === "teal" ? "bg-brand-teal" : tone === "white" ? "bg-white" : "bg-brand-navy",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Onboarding stepper */

export const ONBOARDING_STEPS = ["Subject", "Goals", "Accessibility", "Diagnostic", "Your plan"] as const;

export function StepHeader({ step, title, description }: { step: number; title: string; description?: string }) {
  const total = ONBOARDING_STEPS.length;
  return (
    <header className="mb-8">
      <p className="text-caption font-semibold uppercase tracking-wide text-brand-teal">
        Step {step} of {total} · {ONBOARDING_STEPS[step - 1]}
      </p>
      <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Setup progress">
        {ONBOARDING_STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <span
              className={cx("block h-1.5 rounded-full", i + 1 < step ? "bg-brand-teal" : i + 1 === step ? "bg-brand-navy" : "bg-neutral-200")}
              aria-hidden
            />
            <span className={cx("mt-1.5 hidden truncate text-[12px] sm:block", i + 1 === step ? "font-semibold text-neutral-900" : "text-neutral-600")}>
              {label}
            </span>
            <span className="sr-only">
              {label}
              {i + 1 < step ? " (done)" : i + 1 === step ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <h1 className="mt-6 text-h1 text-neutral-900">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-neutral-600">{description}</p>}
    </header>
  );
}

/* ------------------------------------------------------------------ Large selectable card */

export function SelectCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  role = "radio",
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  role?: "radio" | "checkbox" | "option";
  disabled?: boolean;
}) {
  const ariaState = role === "option" ? { "aria-selected": selected } : { "aria-checked": selected };
  return (
    <button
      type="button"
      role={role}
      {...ariaState}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        "group flex w-full items-start gap-4 rounded-lg border-[1.5px] bg-white p-4 text-left transition-colors duration-fast sm:p-5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-brand-navy bg-brand-navySoft/60" : "border-neutral-200 hover:border-neutral-400",
      )}
    >
      {icon && (
        <span
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            selected ? "bg-brand-navy text-white" : "bg-neutral-100 text-neutral-700",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-semibold text-neutral-900">{title}</span>
          {badge}
        </span>
        {description && <span className="mt-0.5 block text-[14px] text-neutral-600">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          selected ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-400 bg-white",
        )}
      >
        {selected && <Check size={14} weight="bold" />}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ Switch */

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[15px] font-semibold text-neutral-900">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-[14px] text-neutral-600">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
          checked ? "bg-brand-navy" : "bg-neutral-400",
        )}
      >
        <span className="sr-only">{checked ? "On" : "Off"}</span>
        <span
          aria-hidden
          className={cx(
            "inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-fast",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Link tile (hubs, quick links) */

export function ActionTile({
  href,
  icon,
  title,
  description,
  meta,
  tone = "brand",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta?: ReactNode;
  tone?: "brand" | "teal" | "neutral";
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex h-full items-start gap-4 rounded-lg border border-neutral-200 bg-white p-5 transition-shadow duration-fast hover:shadow-raised",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
      )}
    >
      <span
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
          tone === "teal" ? "bg-brand-tealSoft text-brand-teal" : tone === "neutral" ? "bg-neutral-100 text-neutral-700" : "bg-brand-navySoft text-brand-navy",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[16px] font-semibold text-neutral-900">{title}</span>
          {meta}
        </span>
        <span className="mt-0.5 block text-[14px] text-neutral-600">{description}</span>
      </span>
      <CaretRight size={18} className="mt-1 shrink-0 text-neutral-400 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/* ------------------------------------------------------------------ MCQ options (question card anatomy §7.2) */

export function OptionList({
  options,
  value,
  onChange,
  disabled,
  label = "Answer options",
}: {
  options: McqOption[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={cx(
              "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
              selected ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 bg-white hover:border-neutral-400",
            )}
          >
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                selected ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-400 text-neutral-600",
              )}
            >
              {opt.key}
            </span>
            {opt.text}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Section heading */

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-h2">{children}</h2>
      {action}
    </div>
  );
}
