"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, Books, Exam, Gift, LockSimple, type Icon } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Badge, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { excerpt } from "@/components/marketing/Markdown";
import * as api from "@/lib/api/w4";

/** Row shape of GET /marketing/resources (see listResources in lib/api/marketing.ts). */
type Resource = {
  resourceId: string | number;
  title?: string;
  kind?: string;
  emailGated?: boolean;
  bodyMd?: string | null;
  slug?: string;
};

const KINDS: { value: string; label: string; icon: Icon }[] = [
  { value: "ALL", label: "All", icon: Books },
  { value: "GLOSSARY", label: "Glossary", icon: BookOpenText },
  { value: "PAST_PAPER_INDEX", label: "Past papers", icon: Exam },
  { value: "GUIDE", label: "Guides", icon: BookOpenText },
  { value: "LEAD_MAGNET", label: "Free packs", icon: Gift },
];

function kindMeta(kind: string | undefined) {
  return KINDS.find((k) => k.value === kind) ?? { value: kind ?? "", label: kind ? kind.replace(/_/g, " ").toLowerCase() : "Resource", icon: Books };
}

/** A-10 Free Resource Library */
export default function LibraryPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [kind, setKind] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listLibraryResources()
      .then((r) => setItems((r.items ?? []) as Resource[]))
      .catch((e: unknown) => setError(e instanceof Error && e.message ? e.message : "Could not load library"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => (kind === "ALL" ? items : items.filter((i) => i.kind === kind)), [items, kind]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: items.length };
    for (const i of items) if (i.kind) m[i.kind] = (m[i.kind] ?? 0) + 1;
    return m;
  }, [items]);

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow="Free resources"
        title="Resource library"
        description="Glossaries, past-paper indexes and revision guides. Open items need no email; free packs ask for one so we can send the download."
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by resource type">
          {KINDS.map((k) => {
            const KindIcon = k.icon;
            const active = kind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(k.value)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
                  active ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                )}
              >
                <KindIcon size={16} aria-hidden />
                {k.label}
                {!loading && !error && (
                  <span className={cx("tabular text-caption", active ? "text-white/80" : "text-neutral-400")}>{counts[k.value] ?? 0}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8" aria-live="polite">
          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status">
              <span className="sr-only">Loading resources…</span>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="mt-4 h-5 w-3/4" />
                  <Skeleton className="mt-3 h-3" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                </Card>
              ))}
            </div>
          )}
          {error && <ErrorState title="The library didn't load" body={`${error}. Refresh the page to try again.`} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState title="No resources" body="Nothing published in this filter yet." />
          )}
          {!loading && !error && filtered.length > 0 && (
            <ul className="grid animate-rise gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {filtered.map((r) => {
                const meta = kindMeta(r.kind);
                const KindIcon = meta.icon;
                const href = `/resources/${encodeURIComponent(String(r.slug ?? r.resourceId))}`;
                const summary = excerpt(r.bodyMd, 150);
                return (
                  <li key={String(r.resourceId)}>
                    <Link
                      href={href}
                      className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2"
                    >
                      <Card interactive className="flex h-full flex-col p-6">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                            <KindIcon size={18} />
                          </span>
                          {r.emailGated ? (
                            <Badge tone="teal">
                              <LockSimple size={12} weight="bold" /> Free with email
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Open</Badge>
                          )}
                        </div>
                        <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-neutral-600">{meta.label}</p>
                        <h2 className="mt-1 text-[17px] font-semibold leading-snug text-neutral-900 group-hover:text-brand-navy">{r.title ?? "Untitled resource"}</h2>
                        {summary && <p className="mt-2 line-clamp-3 text-[15px] text-neutral-600">{summary}</p>}
                        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-brand-navy">
                          {r.emailGated ? "Get this resource" : "Open"} <ArrowRight size={14} className="transition-transform duration-fast group-hover:translate-x-0.5" />
                        </span>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}
