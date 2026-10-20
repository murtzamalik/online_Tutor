"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChartBar, Quotes, ShieldCheck } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Badge, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { CtaBand, MarketingPage, SectionHeading, onNavyPrimary, onNavySecondary } from "@/components/marketing/MarketingPage";
import { excerpt } from "@/components/marketing/Markdown";
import { formatDate } from "@/components/marketing/format";
import * as api from "@/lib/api/w3";
import { listOutcomes } from "@/lib/api/marketing";

type Outcome = { label?: string; valueText?: string; methodologyMd?: string; sampleSize?: number | null; asOf?: string | null };
type CaseStudy = { caseId?: number | string; title?: string; bodyMd?: string };

/** A-06 — Trust & outcomes */
export default function Page() {
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Outcomes are the primary content; case studies are a bonus and must not take the page down.
      const [o, c] = await Promise.allSettled([listOutcomes(), api.listCaseStudies()]);
      if (cancelled) return;
      if (o.status === "fulfilled") setOutcomes((o.value.items ?? []) as Outcome[]);
      else setError(o.reason instanceof Error && o.reason.message ? o.reason.message : "Could not load");
      if (c.status === "fulfilled") setCases((c.value.items ?? []) as CaseStudy[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow="Trust & outcomes"
        title="Measured, not promised"
        description="Transparent figures with the method behind every number, and stories shared with families’ consent."
      >
        <section aria-labelledby="outcomes-h" aria-live="polite">
          <SectionHeading
            title={<span id="outcomes-h">Outcomes</span>}
            description="Every figure comes with how it was measured and the sample it came from."
          />
          {!outcomes && !error && (
            <div className="grid gap-5 md:grid-cols-2" role="status">
              <span className="sr-only">Loading outcomes…</span>
              {[0, 1].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-9 w-1/3" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                  <Skeleton className="mt-4 h-3" />
                  <Skeleton className="mt-2 h-3 w-4/5" />
                </Card>
              ))}
            </div>
          )}
          {error && <ErrorState title="Outcomes didn't load" body={`${error}. Refresh the page to try again.`} />}
          {outcomes && outcomes.length === 0 && (
            <EmptyState title="Outcomes coming soon" body="Published outcome metrics will appear here once validated." />
          )}
          {outcomes && outcomes.length > 0 && (
            <>
              <ul className="grid animate-rise gap-5 md:grid-cols-2">
                {outcomes.map((o, i) => {
                  const asOf = formatDate(o.asOf, { month: "long", year: "numeric" });
                  return (
                    <li key={`${o.label}-${i}`}>
                      <Card className="flex h-full flex-col p-6">
                        <div className="flex items-start justify-between gap-3">
                          <p className="tabular text-[36px] font-bold leading-none tracking-tight text-brand-navy">{o.valueText ?? "—"}</p>
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-tealSoft text-brand-teal">
                            <ChartBar size={18} />
                          </span>
                        </div>
                        <p className="mt-3 text-[17px] font-semibold text-neutral-900">{o.label}</p>
                        {o.methodologyMd && <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">{excerpt(o.methodologyMd, 400)}</p>}
                        {(o.sampleSize != null || asOf) && (
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            {o.sampleSize != null && (
                              <Badge tone="neutral">
                                <span className="tabular">n = {o.sampleSize}</span>
                              </Badge>
                            )}
                            {asOf && <Badge tone="neutral">As of {asOf}</Badge>}
                          </div>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-caption text-neutral-600">
                <ShieldCheck size={16} aria-hidden /> Accuracy claims remain unvalidated until gold-set review completes.
              </p>
            </>
          )}
        </section>

        {cases.length > 0 && (
          <section className="mt-16" aria-labelledby="cases-h">
            <SectionHeading
              title={<span id="cases-h">From families</span>}
              action={
                <Link className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-navy hover:underline" href="/case-studies">
                  All case studies <ArrowRight size={16} />
                </Link>
              }
            />
            <ul className="grid animate-rise gap-5 md:grid-cols-3">
              {cases.slice(0, 3).map((c, i) => (
                <li key={String(c.caseId ?? i)}>
                  <Card className="h-full p-6">
                    <Quotes size={28} weight="fill" className="text-brand-teal/50" aria-hidden />
                    <p className="mt-3 font-semibold text-neutral-900">{c.title}</p>
                    <p className="mt-2 line-clamp-4 text-[15px] text-neutral-600">{excerpt(c.bodyMd, 260)}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CtaBand
          className="mt-16"
          title="See the marking for yourself"
          body="Try a real exam-style question, or start a free trial and follow your child’s progress week by week."
          actions={
            <>
              <Link href="/signup" className={onNavyPrimary}>Start free trial</Link>
              <Link href="/try" className={onNavySecondary}>Try a question</Link>
            </>
          }
        />
      </MarketingPage>
    </PublicFrame>
  );
}
