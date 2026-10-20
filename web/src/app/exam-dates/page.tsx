"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarBlank, Info } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Badge, Callout, Card, Field, Select } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { CtaBand, MarketingPage, onNavyPrimary } from "@/components/marketing/MarketingPage";
import { toDate } from "@/components/marketing/format";
import { listExamDates } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";

type ExamDate = { examName: string; examOn: string; region: string; notes?: string | null };

const REGIONS: { value: string; label: string }[] = [
  { value: "England", label: "England" },
  { value: "Wales", label: "Wales" },
  { value: "Scotland", label: "Scotland" },
  { value: "NI", label: "Northern Ireland" },
  { value: "International", label: "International" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}

/** A-08 — Exam date calendar */
export default function ExamDatesPage() {
  const [items, setItems] = useState<ExamDate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState("England");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    listExamDates(region)
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load exam dates");
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  const { upcoming, past, months } = useMemo(() => {
    const rows = (items ?? [])
      .map((d) => ({ ...d, date: toDate(d.examOn) }))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    const up = rows.filter((r) => !r.date || daysUntil(r.date) >= 0);
    const pa = rows.filter((r) => r.date && daysUntil(r.date) < 0);
    const list = showPast ? rows : up;
    const byMonth = new Map<string, typeof rows>();
    for (const r of list) {
      const key = r.date ? r.date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Date to be confirmed";
      const group = byMonth.get(key) ?? [];
      group.push(r);
      byMonth.set(key, group);
    }
    return { upcoming: up, past: pa, months: Array.from(byMonth.entries()) };
  }, [items, showPast]);

  const next = upcoming.find((r) => r.date);
  const regionLabel = REGIONS.find((r) => r.value === region)?.label ?? region;

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="Revision planning"
        title="Exam dates"
        description="Key exam dates to plan revision around. Always confirm against your exam board’s official timetable."
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Field label="Region" htmlFor="region" className="w-full sm:w-64">
            <Select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {past.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium text-neutral-700">
              <input type="checkbox" className="h-4 w-4 accent-[var(--tier-accent)]" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
              Show past dates ({past.length})
            </label>
          )}
        </div>

        <div className="mt-8" aria-live="polite">
          {!items && !error && <LoadingState label="Loading exam dates…" lines={5} />}
          {error && <ErrorState title="Exam dates didn't load" body={`${error}. Try another region or refresh the page.`} />}
          {items && items.length === 0 && (
            <EmptyState title="No dates yet" body={`We haven't published exam dates for ${regionLabel} yet. Try another region.`} />
          )}

          {items && items.length > 0 && (
            <div className="animate-rise space-y-8">
              {next?.date && (
                <Card className="flex items-center gap-5 border-brand-navy/20 bg-brand-navySoft/50 p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
                    <CalendarBlank size={24} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-caption font-semibold uppercase tracking-wide text-brand-navy">Next up in {regionLabel}</p>
                    <p className="mt-0.5 text-[17px] font-semibold text-neutral-900">{next.examName}</p>
                    <p className="text-[14px] text-neutral-600">
                      {next.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {" · "}
                      <span className="tabular font-semibold text-neutral-900">
                        {daysUntil(next.date) === 0 ? "today" : `${daysUntil(next.date)} days to go`}
                      </span>
                    </p>
                  </div>
                </Card>
              )}

              {months.length === 0 ? (
                <EmptyState title="No upcoming dates" body="All published dates for this region have passed. Tick “Show past dates” to see them." />
              ) : (
                months.map(([month, rows]) => (
                  <section key={month} aria-labelledby={`m-${month.replace(/\W+/g, "-")}`}>
                    <h2 id={`m-${month.replace(/\W+/g, "-")}`} className="text-caption font-semibold uppercase tracking-wide text-neutral-600">
                      {month}
                    </h2>
                    <ul className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      {rows.map((d, i) => {
                        const days = d.date ? daysUntil(d.date) : null;
                        const isPast = days != null && days < 0;
                        return (
                          <li key={`${d.examName}-${i}`} className={cx("flex items-start gap-4 px-5 py-4", isPast && "opacity-60")}>
                            <div className="flex w-14 shrink-0 flex-col items-center rounded-md border border-neutral-200 py-1.5 text-center">
                              <span className="text-[11px] font-semibold uppercase text-brand-teal">
                                {d.date ? d.date.toLocaleDateString("en-GB", { weekday: "short" }) : "TBC"}
                              </span>
                              <span className="tabular text-[20px] font-bold leading-tight text-neutral-900">
                                {d.date ? d.date.getDate() : "—"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-neutral-900">{d.examName}</p>
                              <p className="text-[14px] text-neutral-600">
                                {d.date ? d.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : d.examOn}
                                {" · "}
                                {d.region}
                              </p>
                              {d.notes && <p className="mt-1 text-[14px] text-neutral-600">{d.notes}</p>}
                            </div>
                            {days != null && (
                              <Badge tone={isPast ? "neutral" : days <= 30 ? "warning" : "info"} className="shrink-0">
                                {isPast ? "Passed" : days === 0 ? "Today" : `${days} days`}
                              </Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}

              <Callout tone="info">
                <span className="inline-flex items-start gap-2">
                  <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
                  This calendar is for revision planning. Exam boards publish the official timetable — check it for times, papers and any changes.
                </span>
              </Callout>
            </div>
          )}
        </div>

        <CtaBand
          className="mt-12"
          title="Turn the countdown into a plan"
          body="Study Loop builds a weekly revision plan around your exam dates and the topics that need the most work."
          actions={
            <Link href="/signup" className={onNavyPrimary}>
              Start free trial
            </Link>
          }
        />
      </MarketingPage>
    </PublicFrame>
  );
}
