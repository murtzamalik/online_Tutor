"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, ChatCircleText, MagnifyingGlass } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { Markdown, markdownToText } from "@/components/marketing/Markdown";
import { humanise } from "@/components/marketing/format";
import { listFaq } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";

type Faq = { faqId: string | number; category: string; question: string; answerMd: string; sortOrder?: number };

/** A-03 — FAQ */
export default function FaqPage() {
  const [items, setItems] = useState<Faq[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    listFaq()
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load FAQ"));
  }, []);

  const categories = useMemo(() => Array.from(new Set((items ?? []).map((f) => f.category))), [items]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (items ?? []).filter(
      (f) =>
        (category === "ALL" || f.category === category) &&
        (!q || f.question.toLowerCase().includes(q) || markdownToText(f.answerMd).toLowerCase().includes(q)),
    );
    const map = new Map<string, Faq[]>();
    for (const f of filtered) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return Array.from(map.entries());
  }, [items, category, query]);

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Marking, exam boards, cost and parent accounts — the questions families ask us most."
      >
        <div aria-live="polite">
          {!items && !error && <LoadingState label="Loading questions…" lines={5} />}
          {error && <ErrorState title="Questions didn't load" body={`${error}. Refresh the page or visit the help centre.`} action={<ButtonLink href="/help" variant="secondary">Open help centre</ButtonLink>} />}
          {items && items.length === 0 && <EmptyState title="No FAQ yet" body="Check back soon, or ask us in the help centre." />}

          {items && items.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="faq-search" className="sr-only">Search questions</label>
                  <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
                  <Input
                    id="faq-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search questions"
                    className="pl-10"
                  />
                </div>
                {categories.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
                    {["ALL", ...categories].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                        className={cx(
                          "rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors duration-fast",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
                          category === c
                            ? "border-brand-navy bg-brand-navy text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                        )}
                      >
                        {c === "ALL" ? "All topics" : humanise(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {groups.length === 0 ? (
                <div className="mt-8">
                  <EmptyState title="No matching questions" body="Try a different word, or clear the filter." />
                </div>
              ) : (
                <div className="mt-8 space-y-10">
                  {groups.map(([cat, list]) => (
                    <section key={cat} aria-labelledby={`cat-${cat.replace(/\W+/g, "-")}`}>
                      <h2 id={`cat-${cat.replace(/\W+/g, "-")}`} className="text-caption font-semibold uppercase tracking-wide text-brand-teal">
                        {humanise(cat)}
                      </h2>
                      <div className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                        {list.map((f) => (
                          <details key={String(f.faqId)} className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-semibold text-neutral-900 hover:bg-neutral-050 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy/30 [&::-webkit-details-marker]:hidden">
                              <span>{f.question}</span>
                              <CaretDown size={18} className="shrink-0 text-neutral-400 transition-transform duration-fast group-open:rotate-180" aria-hidden />
                            </summary>
                            <div className="px-5 pb-5">
                              <Markdown source={f.answerMd} size="sm" />
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <Card className="mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-tealSoft text-brand-teal">
              <ChatCircleText size={20} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-neutral-900">Still have a question?</h2>
              <p className="text-[15px] text-neutral-600">Browse step-by-step guides or talk to our support team.</p>
            </div>
          </div>
          <ButtonLink href="/help" variant="secondary">Visit the help centre</ButtonLink>
        </Card>
      </MarketingPage>
    </PublicFrame>
  );
}
