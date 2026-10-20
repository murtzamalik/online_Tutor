"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CaretDown, Quotes } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { CtaBand, MarketingPage, onNavyPrimary, onNavySecondary } from "@/components/marketing/MarketingPage";
import { Markdown, excerpt } from "@/components/marketing/Markdown";
import { formatDate } from "@/components/marketing/format";
import * as api from "@/lib/api/w3";

type CaseStudy = {
  caseId?: number | string;
  title?: string;
  bodyMd?: string;
  publishedAt?: string | number | null;
};

/** A-07 — Case studies */
export default function Page() {
  const [items, setItems] = useState<CaseStudy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.listCaseStudies();
        if (!cancelled) setItems((result.items ?? []) as CaseStudy[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error && e.message ? e.message : "Could not load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="Case studies"
        title="Stories from families and schools"
        description="Real experiences from consented pilots — what changed, and how they used Study Loop."
      >
        <div aria-live="polite">
          {!items && !error && (
            <div className="space-y-5" role="status">
              <span className="sr-only">Loading case studies…</span>
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-4 h-3" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                  <Skeleton className="mt-2 h-3 w-3/5" />
                </Card>
              ))}
            </div>
          )}
          {error && <ErrorState title="Case studies didn't load" body={`${error}. Refresh the page to try again.`} />}
          {items && items.length === 0 && (
            <EmptyState title="No case studies yet" body="Approved stories will appear here once published." />
          )}
          {items && items.length > 0 && (
            <ul className="animate-rise space-y-5">
              {items.map((c, i) => {
                const published = formatDate(c.publishedAt, { month: "long", year: "numeric" });
                const short = excerpt(c.bodyMd, 240);
                const hasMore = short.endsWith("…");
                return (
                  <li key={String(c.caseId ?? i)}>
                    <Card className="p-6 sm:p-8">
                      <div className="flex items-start gap-4">
                        <Quotes size={32} weight="fill" className="hidden shrink-0 text-brand-teal/40 sm:block" aria-hidden />
                        <div className="min-w-0 flex-1">
                          {published && <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">{published}</p>}
                          <h2 className="mt-1 text-h2 text-neutral-900">{c.title ?? "Case study"}</h2>
                          {hasMore ? (
                            <details className="group mt-3">
                              <summary className="list-none [&::-webkit-details-marker]:hidden">
                                <span className="block text-[16px] leading-relaxed text-neutral-700 group-open:hidden">{short}</span>
                                <span className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md text-[15px] font-semibold text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30">
                                  <span className="group-open:hidden">Read the full story</span>
                                  <span className="hidden group-open:inline">Show less</span>
                                  <CaretDown size={16} className="transition-transform duration-fast group-open:rotate-180" aria-hidden />
                                </span>
                              </summary>
                              <Markdown source={c.bodyMd} skipFirstH1 className="mt-4" />
                            </details>
                          ) : (
                            short && <p className="mt-3 text-[16px] leading-relaxed text-neutral-700">{short}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <CtaBand
          className="mt-12"
          title="Bringing Study Loop to your school?"
          body="See the teacher console, class insights and our safeguarding workflow."
          actions={
            <>
              <Link href="/results" className={onNavyPrimary}>Trust &amp; outcomes</Link>
              <Link href="/help" className={onNavySecondary}>Contact us</Link>
            </>
          }
        />
      </MarketingPage>
    </PublicFrame>
  );
}
