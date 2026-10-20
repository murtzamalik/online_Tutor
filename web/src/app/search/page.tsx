"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { BookOpenText, CardsThree, MagnifyingGlass, Notebook } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Input, PageHeader } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";
import { asArray, asRecord, humanise, str } from "@/components/parent/format";

type Result = { key: string; title: string; kind: string; snippet?: string; href?: string };

const KIND_META: Record<string, { label: string; icon: Icon }> = {
  TOPIC: { label: "Topic", icon: BookOpenText },
  NOTE: { label: "Revision note", icon: Notebook },
  DECK: { label: "Flashcards", icon: CardsThree },
};

function hrefFor(r: Record<string, unknown>): string | undefined {
  if (typeof r.href === "string" && r.href) return r.href;
  const kind = str(r.kind);
  if (kind === "TOPIC" && r.id != null) return `/revise/notes/${String(r.id)}`;
  if (kind === "NOTE" && r.topicId != null) return `/revise/notes/${String(r.topicId)}`;
  if (kind === "DECK" && r.id != null) return `/revise/decks/${String(r.id)}`;
  return undefined;
}

function toResults(data: unknown): Result[] {
  const d = asRecord(data);
  const list = Array.isArray(d.items) ? d.items : asArray(d.results);
  return list.map((v, i) => {
    const r = asRecord(v);
    const snippet = str(r.snippet) ?? str(r.summary) ?? str(r.body);
    return {
      key: `${str(r.kind) ?? "R"}-${String(r.id ?? r.slug ?? i)}`,
      title: str(r.title) ?? str(r.name) ?? str(r.topicTitle) ?? "Result",
      kind: str(r.kind) ?? "",
      snippet,
      href: hrefFor(r),
    };
  });
}

/** Shell-08 — In-app search */
export default function Page() {
  const [data, setData] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsStudent, setNeedsStudent] = useState(false);
  const [query, setQuery] = useState("atomic");
  const [lastQuery, setLastQuery] = useState("atomic");
  const [searching, setSearching] = useState(false);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  async function runSearch(q: string) {
    setError(null);
    setNeedsStudent(false);
    setSearching(true);
    try {
      const result = await api.searchInApp(q, token);
      setData(toResults(result));
      setLastQuery(q);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "Could not load";
      const studentRequired =
        /student access required/i.test(msg) || (e instanceof ApiError && e.status === 403 && /student/i.test(msg));
      if (studentRequired) {
        setNeedsStudent(true);
        setData(null);
      } else {
        setError(msg);
      }
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    void runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await runSearch(query);
  }

  return (
    <AppPage width="content">
      <PageHeader title="Search" description="Find topics, revision notes and flashcard decks." />

      {needsStudent ? (
        <EmptyState
          title="Search is available after child login"
          body="In-app search is for the learner account. Sign in as a child, or open the parent home to manage children."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/child-login">Child login</ButtonLink>
              <ButtonLink href="/parent" variant="secondary">
                Parent home
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <form onSubmit={onSubmit} role="search" className="mb-6 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="search-q">
              Search
            </label>
            <div className="relative min-w-[12rem] flex-1">
              <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
              <Input
                id="search-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                placeholder="Search topics…"
              />
            </div>
            <Button type="submit" loading={searching}>
              Search
            </Button>
          </form>

          <div aria-live="polite">
            {!data && !error && <LoadingState />}
            {error && <ErrorState body={error} />}
            {data && !error && data.length === 0 && (
              <EmptyState title="No matches" body="Try a different keyword, or browse subjects from home." />
            )}
            {data && !error && data.length > 0 && (
              <>
                <p className="mb-3 text-caption text-neutral-600">
                  {data.length} result{data.length === 1 ? "" : "s"} for &ldquo;{lastQuery}&rdquo;
                </p>
                <Card className="divide-y divide-neutral-100 overflow-hidden">
                  {data.map((item) => {
                    const meta = KIND_META[item.kind];
                    const KindIcon = meta?.icon ?? BookOpenText;
                    const inner = (
                      <>
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                          <KindIcon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-semibold text-neutral-900">{item.title}</span>
                            {item.kind && <Badge tone="neutral">{meta?.label ?? humanise(item.kind)}</Badge>}
                          </span>
                          {item.snippet && <span className="mt-0.5 block text-[14px] text-neutral-700">{item.snippet}</span>}
                        </span>
                      </>
                    );
                    return item.href ? (
                      <Link key={item.key} href={item.href} className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-fast hover:bg-neutral-050">
                        {inner}
                      </Link>
                    ) : (
                      <div key={item.key} className="flex items-start gap-3 px-5 py-3.5">
                        {inner}
                      </div>
                    );
                  })}
                </Card>
              </>
            )}
          </div>
        </>
      )}
    </AppPage>
  );
}
