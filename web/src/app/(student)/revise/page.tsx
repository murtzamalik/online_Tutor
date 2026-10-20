"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cards, FileText, Lightning, Notebook, Plus, ShareNetwork } from "@phosphor-icons/react";
import * as w3 from "@/lib/api/w3";
import * as w4 from "@/lib/api/w4";
import { ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Card, MasteryBadge, MasteryRing, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState, Skeleton } from "@/components/ui/states";
import { FailureView, SectionTitle } from "@/components/student/StudentUI";
import {
  isRecord,
  parseTopics,
  readSession,
  readToken,
  str,
  toFailure,
  type LoadFailure,
  type StudentTopic,
} from "@/components/student/studentData";

type Deck = { deckId: string; kind: string; title: string; topicId: number | null };

function parseDecks(res: unknown): Deck[] {
  const items = isRecord(res) && Array.isArray(res.items) ? res.items : [];
  return items.filter(isRecord).map((d) => ({
    deckId: str(d.deckId),
    kind: str(d.kind, "CUSTOM"),
    title: str(d.title, "Untitled deck"),
    topicId: typeof d.topicId === "number" ? d.topicId : null,
  }));
}

/** Revise hub — topics (from enrolment mastery) with notes / cheat sheet / 2-minute check, plus flashcard decks. */
export default function ReviseHubPage() {
  const [topics, setTopics] = useState<StudentTopic[] | null>(null);
  const [topicFailure, setTopicFailure] = useState<LoadFailure | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [deckFailure, setDeckFailure] = useState<LoadFailure | null>(null);

  const load = useCallback(() => {
    const studentId = readSession("studentId");
    setTopicFailure(null);
    setDeckFailure(null);
    setTopics(null);
    setDecks(null);
    if (!studentId) {
      setTopicFailure({ kind: "error", message: "Open Home first so we can find your subjects." });
      setTopics([]);
    } else {
      w3.studentTopics(studentId, readToken())
        .then((r: unknown) => setTopics(parseTopics(r)))
        .catch((e: unknown) => setTopicFailure(toFailure(e, "Could not load your topics.")));
    }
    w4.listDecks()
      .then((r) => setDecks(parseDecks(r)))
      .catch((e: unknown) => setDeckFailure(toFailure(e, "Could not load your flashcard decks.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const suggested = topics && topics.length > 0 ? topics.slice().sort((a, b) => a.mastery - b.mastery)[0] : null;
  const topicName = (id: number | null) => (id == null ? null : topics?.find((t) => t.topicId === id)?.topicName ?? null);

  return (
    <AppPage>
      <PageHeader
        title="Revise"
        description="Short notes, cheat sheets and flashcards for every topic."
        actions={
          <ButtonLink href="/revise/decks/new" variant="secondary" size="sm" icon={<Plus size={16} />}>
            New deck
          </ButtonLink>
        }
      />

      <div className="space-y-8">
        {suggested && (
          <Card className="flex flex-wrap items-center gap-5 border-brand-navy/15 bg-gradient-to-br from-brand-navySoft to-white p-6">
            <MasteryRing value={suggested.mastery} size={56} label={suggested.topicName} />
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-brand-teal">Suggested next</p>
              <h2 className="mt-1 text-[20px] font-bold text-neutral-900">{suggested.topicName}</h2>
              <p className="text-[14px] text-neutral-700">A 2-minute check shows what to revise first.</p>
            </div>
            <ButtonLink href={`/revise/check/${suggested.topicId}`} size="lg" icon={<Lightning size={18} />}>
              Start 2-minute check
            </ButtonLink>
          </Card>
        )}

        <section aria-labelledby="topics-title">
          <SectionTitle>
            <span id="topics-title">Topics</span>
          </SectionTitle>
          {topicFailure ? (
            <FailureView
              failure={topicFailure}
              onRetry={load}
              action={topicFailure.message.startsWith("Open Home") ? <ButtonLink href="/home" variant="secondary" size="sm">Go to Home</ButtonLink> : undefined}
            />
          ) : topics === null ? (
            <LoadingState label="Loading topics…" lines={5} />
          ) : topics.length === 0 ? (
            <EmptyState
              title="No topics yet"
              body="Topics appear once you’re enrolled on a subject."
              action={<ButtonLink href="/onboarding/subjects">Choose subjects</ButtonLink>}
            />
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-100">
                {topics.map((t) => (
                  <li key={t.topicId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <MasteryRing value={t.mastery} size={40} label={t.topicName} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">
                        {t.topicNumber && <span className="tabular mr-1.5 text-neutral-600">{t.topicNumber}</span>}
                        {t.topicName}
                      </p>
                      <MasteryBadge value={t.mastery} />
                    </div>
                    <nav aria-label={`Revise ${t.topicName}`} className="flex flex-wrap gap-1">
                      <Link href={`/revise/notes/${t.topicId}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-brand-navy hover:bg-neutral-100">
                        <Notebook size={16} aria-hidden /> Notes
                      </Link>
                      <Link href={`/revise/cheat-sheet/${t.topicId}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-brand-navy hover:bg-neutral-100">
                        <FileText size={16} aria-hidden /> Cheat sheet
                      </Link>
                      <Link href={`/revise/check/${t.topicId}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-brand-navy hover:bg-neutral-100">
                        <Lightning size={16} aria-hidden /> Check
                      </Link>
                    </nav>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section aria-labelledby="decks-title">
          <SectionTitle
            action={
              <Link href="/revise/share" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-navy hover:underline">
                <ShareNetwork size={16} aria-hidden /> Share or open a deck
              </Link>
            }
          >
            <span id="decks-title">Flashcard decks</span>
          </SectionTitle>
          {deckFailure ? (
            <FailureView failure={deckFailure} onRetry={load} />
          ) : decks === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <EmptyState
              title="No flashcard decks yet"
              body="Make your own deck in a couple of minutes."
              action={<ButtonLink href="/revise/decks/new">Create a deck</ButtonLink>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((d) => (
                <li key={d.deckId}>
                  <Link
                    href={`/revise/decks/${d.deckId}`}
                    className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-shadow duration-fast hover:shadow-raised"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Cards size={22} className="text-brand-navy" aria-hidden />
                      <Badge tone={d.kind === "SYSTEM" ? "teal" : "neutral"}>{d.kind === "SYSTEM" ? "Study Loop" : "Yours"}</Badge>
                    </span>
                    <span className="mt-3 font-semibold text-neutral-900">{d.title}</span>
                    {topicName(d.topicId) && <span className="mt-0.5 text-caption text-neutral-600">{topicName(d.topicId)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppPage>
  );
}
