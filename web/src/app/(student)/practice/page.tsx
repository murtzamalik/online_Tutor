"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowCounterClockwise, ArrowRight, Camera, Compass, Copy, Lightning, ListChecks, Path } from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ActionTile, FailureView, ProgressBar } from "@/components/student/StudentUI";
import { toFailure, type LoadFailure } from "@/components/student/studentData";
import {
  loadStudentContext,
  startMixedPractice,
  START_PRACTICE_FALLBACK_ERROR,
  type StudentContext,
} from "@/components/student/studentContext";

/** Practice hub — one primary "Start practice" (same session logic as Home), then every practice mode. */
export default function PracticeHubPage() {
  const [ctx, setCtx] = useState<StudentContext | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
      })
      .catch((err: unknown) => setFailure(toFailure(err, "Could not load practice.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onStart() {
    setStartError(null);
    if (!ctx?.enrolmentId) {
      setStartError("You’re not enrolled on a subject yet. Ask a parent to choose one for you.");
      return;
    }
    setStarting(true);
    try {
      await startMixedPractice(ctx.enrolmentId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : START_PRACTICE_FALLBACK_ERROR);
      setStarting(false);
    }
  }

  const diagnosticHref =
    ctx?.studentId && ctx.enrolmentId
      ? `/onboarding/diagnostic?studentId=${ctx.studentId}&enrolmentId=${ctx.enrolmentId}`
      : "/onboarding/diagnostic";

  return (
    <AppPage>
      <PageHeader title="Practice" description="Exam-style questions, marked the moment you submit." />

      {failure ? (
        <FailureView failure={failure} onRetry={load} />
      ) : !ctx ? (
        <LoadingState label="Loading practice…" lines={4} />
      ) : !ctx.enrolmentId ? (
        <EmptyState
          title="Choose a subject first"
          body="Practice is built from your exam board and subject. It only takes a minute."
          action={
            <ButtonLink href={ctx.studentId ? `/onboarding/subjects?studentId=${ctx.studentId}` : "/onboarding/subjects"}>
              Choose subjects
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-8">
          <Card className="overflow-hidden border-brand-navy/15 bg-gradient-to-br from-brand-navySoft to-white">
            <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
              <div className="min-w-0">
                <Badge tone="brand">
                  <Lightning size={12} weight="fill" /> Recommended
                </Badge>
                <h2 className="mt-3 text-[22px] font-bold leading-tight text-neutral-900">A quick mixed set</h2>
                <p className="mt-1.5 max-w-lg text-neutral-700">5 questions chosen from the topics that need you most.</p>
                {ctx.goal && (
                  <div className="mt-4 max-w-xs">
                    <p className="mb-1.5 text-caption text-neutral-700">
                      Today: <span className="tabular font-semibold">{ctx.goal.answered} / {ctx.goal.target}</span> questions
                    </p>
                    <ProgressBar value={ctx.goal.answered} max={ctx.goal.target} label="Daily goal progress" />
                  </div>
                )}
              </div>
              <Button size="lg" onClick={onStart} loading={starting} icon={<ArrowRight size={18} />}>
                Start practice
              </Button>
            </div>
            {startError && (
              <div className="px-6 pb-6 sm:px-8">
                <Callout tone="danger" title="Practice didn’t start">
                  {startError}
                </Callout>
              </div>
            )}
          </Card>

          <section aria-labelledby="modes">
            <h2 id="modes" className="mb-3 text-h2">
              Choose how to practise
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <ActionTile
                href="/practice/custom"
                icon={<ListChecks size={22} />}
                title="Build a custom quiz"
                description="Pick the topics and number of questions."
              />
              <ActionTile
                href="/practice/redrill"
                icon={<ArrowCounterClockwise size={22} />}
                title="Redrill missed questions"
                description="Have another go at questions you didn’t get full marks on."
              />
              <ActionTile
                href="/practice/keep-going"
                icon={<Path size={22} />}
                title="Keep going"
                description="An adaptive drill that stops once you’re consistent."
              />
              <ActionTile
                href="/practice/multi-version"
                icon={<Copy size={22} />}
                title="Same skill, new versions"
                description="Practise one idea across several versions of a question."
              />
              <ActionTile
                href="/practice/photo"
                tone="neutral"
                icon={<Camera size={22} />}
                title="Photo marking"
                description="Mark a handwritten answer from a photo."
                meta={<Badge>Coming soon</Badge>}
              />
              <ActionTile
                href={diagnosticHref}
                tone="teal"
                icon={<Compass size={22} />}
                title="Placement diagnostic"
                description="A short adaptive check that sets your starting point."
              />
            </div>
          </section>
        </div>
      )}
    </AppPage>
  );
}
