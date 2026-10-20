"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, CalendarCheck, ChatsCircle, Exam, Play, Target } from "@phosphor-icons/react";
import * as w3 from "@/lib/api/w3";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Callout, Card, CardBody, CardHeader, MasteryBadge, MasteryRing, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState, Skeleton } from "@/components/ui/states";
import { LiveChatWidget } from "@/components/support/LiveChatWidget";
import { SurpriseQuizCard } from "@/components/student/SurpriseQuizCard";
import { ActionTile, FailureView, ProgressBar } from "@/components/student/StudentUI";
import {
  formatDate,
  isRecord,
  num,
  parseTopics,
  readToken,
  toFailure,
  type LoadFailure,
  type StudentTopic,
} from "@/components/student/studentData";
import {
  loadStudentContext,
  startMixedPractice,
  START_PRACTICE_FALLBACK_ERROR,
  type StudentContext,
} from "@/components/student/studentContext";

type DueReview = { topicId: number; dueAt: unknown };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Shell-01 — Student home: next action, due reviews, mastery snapshot, quick links. */
export default function StudentHomePage() {
  const [ctx, setCtx] = useState<StudentContext | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [topics, setTopics] = useState<StudentTopic[] | null>(null);

  const load = useCallback(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setFailure({ kind: "error", message: "Sign in to continue." });
      return;
    }
    setFailure(null);
    loadStudentContext(token)
      .then((c) => {
        if (c.redirectTo) {
          window.location.href = c.redirectTo;
          return;
        }
        setCtx(c);
        if (c.studentId) {
          w3.studentTopics(c.studentId, readToken())
            .then((r: unknown) => setTopics(parseTopics(r)))
            .catch(() => setTopics([]));
        } else {
          setTopics([]);
        }
      })
      .catch((err: unknown) => setFailure(toFailure(err, "Could not load your profile.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onStart() {
    setPracticeError(null);
    if (!ctx?.enrolmentId) {
      setPracticeError("You’re not enrolled on a subject yet. Ask a parent to choose one for you.");
      return;
    }
    setStarting(true);
    try {
      await startMixedPractice(ctx.enrolmentId);
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : START_PRACTICE_FALLBACK_ERROR);
      setStarting(false);
    }
  }

  if (failure) {
    return (
      <AppPage>
        <FailureView failure={failure} onRetry={load} />
      </AppPage>
    );
  }

  if (!ctx) {
    return (
      <AppPage>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <LoadingState label="Loading your home…" lines={4} />
      </AppPage>
    );
  }

  const { me, studentId, enrolmentId, home, goal } = ctx;
  const firstName = (me.displayName ?? "").split(/\s+/)[0] || "there";
  const reviewsDue: DueReview[] = Array.isArray(home?.reviewsDue)
    ? (home!.reviewsDue as unknown[]).filter(isRecord).map((r) => ({ topicId: num(r.topicId) ?? 0, dueAt: r.dueAt }))
    : [];
  const topicName = (id: number) => topics?.find((t) => t.topicId === id)?.topicName ?? `Topic ${id}`;
  const goalDone = goal ? goal.answered >= goal.target && goal.target > 0 : false;
  const snapshot = (topics ?? []).slice().sort((a, b) => b.mastery - a.mastery).slice(0, 6);

  return (
    <AppPage>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting()}, ${firstName}`}
        description={enrolmentId ? "Here’s your next step. A short set keeps your progress moving." : "Let’s get you set up so you can start practising."}
      />

      <div className="space-y-6">
        {studentId && <SurpriseQuizCard studentId={studentId} />}

        {/* Hero: the single next action */}
        {enrolmentId ? (
          <Card className="overflow-hidden border-brand-navy/15 bg-gradient-to-br from-brand-navySoft to-white">
            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Badge tone="brand">
                  <Play size={12} weight="fill" /> Continue
                </Badge>
                <h2 className="mt-3 text-[22px] font-bold leading-tight text-neutral-900">5 questions picked for you</h2>
                <p className="mt-1.5 max-w-lg text-neutral-700">
                  We start with the topics that will help you most right now. About 10 minutes.
                </p>
                {goal && (
                  <div className="mt-5 max-w-sm" aria-label="Daily goal">
                    <div className="mb-1.5 flex items-center justify-between text-[14px]">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                        <Target size={16} className="text-brand-navy" /> Today’s goal
                      </span>
                      <span className="tabular text-neutral-700">
                        {goal.answered} / {goal.target} questions
                      </span>
                    </div>
                    <ProgressBar value={goal.answered} max={goal.target} label="Daily goal progress" tone={goalDone ? "teal" : "brand"} />
                    {goalDone && <p className="mt-1.5 text-caption font-semibold text-brand-teal">Goal done for today — nice work.</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-2 md:items-end">
                <Button size="lg" onClick={onStart} loading={starting} icon={<ArrowRight size={18} />}>
                  Start practice
                </Button>
                {studentId && (
                  <Link
                    href={`/onboarding/diagnostic?studentId=${studentId}&enrolmentId=${enrolmentId}`}
                    className="text-center text-[14px] font-semibold text-brand-navy underline-offset-2 hover:underline"
                  >
                    Take the placement diagnostic
                  </Link>
                )}
              </div>
            </div>
            {practiceError && (
              <div className="px-6 pb-6 sm:px-8">
                <Callout tone="danger" title="Practice didn’t start">
                  {practiceError}
                </Callout>
              </div>
            )}
          </Card>
        ) : studentId ? (
          <EmptyState
            title="Choose your subject to begin"
            body="Pick your exam board and subject, and we’ll build practice around it."
            action={<ButtonLink href={`/onboarding/subjects?studentId=${studentId}`}>Choose subjects</ButtonLink>}
          />
        ) : (
          <EmptyState title="Ready when you are" body="Ask a parent to enrol you on a board-track, then start practice here." />
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Due reviews */}
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <CalendarCheck size={20} className="text-brand-teal" /> Reviews due
                </span>
              }
              description="Quick checks to keep topics fresh."
              action={reviewsDue.length > 0 ? <Badge tone="teal">{reviewsDue.length}</Badge> : undefined}
            />
            <CardBody className="py-2">
              {reviewsDue.length === 0 ? (
                <p className="py-4 text-[14px] text-neutral-600">Nothing due right now. Topics come back here when it’s time for a quick refresh.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {reviewsDue.map((r) => (
                    <li key={r.topicId}>
                      <Link
                        href={`/revise/check/${r.topicId}`}
                        className="flex items-center justify-between gap-3 rounded-md py-3 hover:bg-neutral-050"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-neutral-900">{topicName(r.topicId)}</span>
                          <span className="text-caption text-neutral-600">Due {formatDate(r.dueAt, { day: "numeric", month: "short" })}</span>
                        </span>
                        <span className="shrink-0 text-[14px] font-semibold text-brand-navy">2-min check</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Mastery snapshot */}
          <Card>
            <CardHeader
              title="Your topics"
              description="Mastery grows as you practise."
              action={
                <Link href="/student/map" className="text-[14px] font-semibold text-brand-navy hover:underline">
                  See all
                </Link>
              }
            />
            <CardBody>
              {topics === null ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : snapshot.length === 0 ? (
                <p className="py-2 text-[14px] text-neutral-600">Your topics appear here once you’re enrolled on a subject.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {snapshot.map((t) => (
                    <li key={t.topicId}>
                      <Link
                        href={`/revise/notes/${t.topicId}`}
                        className="flex items-center gap-3 rounded-md border border-neutral-100 p-2.5 hover:border-neutral-200 hover:bg-neutral-050"
                      >
                        <MasteryRing value={t.mastery} size={42} label={t.topicName} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold text-neutral-900">{t.topicName}</span>
                          <MasteryBadge value={t.mastery} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Quick links */}
        <section aria-labelledby="quick-links">
          <h2 id="quick-links" className="mb-3 text-h2">
            More ways to study
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionTile href="/tutor" tone="teal" icon={<ChatsCircle size={22} />} title="Ask the tutor" description="Talk a tricky question through, step by step." />
            <ActionTile href="/revise" icon={<BookOpenText size={22} />} title="Revise" description="Notes, cheat sheets and flashcards by topic." />
            <ActionTile href="/mock/new" icon={<Exam size={22} />} title="Mock exam" description="A timed paper in real exam conditions." />
          </div>
          <p className="mt-4 text-[14px] text-neutral-600">
            Looking for something else?{" "}
            <Link href="/practice" className="font-semibold text-brand-navy hover:underline">
              All practice options
            </Link>
          </p>
        </section>
      </div>

      <LiveChatWidget />
    </AppPage>
  );
}
