"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightning } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { errorText, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";
import { startPractice } from "@/lib/api/practice";

type SurpriseQuiz = {
  quizId?: string;
  prompt?: string;
  reason?: string;
  status?: string;
  topicIds?: number[];
  message?: string;
  quiz?: null;
};

const REASON_COPY: Record<string, string> = {
  NOT_RECENTLY_TOUCHED: "A topic you haven’t visited lately",
  MARKED_SECURE_CHECK: "A quick check on a topic you know well",
  AVOIDED_TOPIC: "A topic worth another look",
};

/** G-01 — Surprise micro-quiz */
export default function Page() {
  const router = useRouter();
  const [data, setData] = useState<SurpriseQuiz | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"start" | "skip" | null>(null);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!studentId) throw new Error("Sign in");
        const result = (await api.surpriseQuiz(studentId, token)) as SurpriseQuiz | null;
        if (!cancelled) setData(result ?? {});
      } catch (e: unknown) {
        if (!cancelled) setFailure(toFailure(e, "Could not load"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, studentId]);

  async function startQuiz() {
    if (!data?.quizId) return;
    setBusy("start");
    setActionError(null);
    try {
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("No active enrolment — open Home first");
      const session = await startPractice({
        enrolmentId,
        mode: "MIXED",
        topicIds: data.topicIds?.length ? data.topicIds : undefined,
        plannedCount: 2,
      });
      await api.completeSurprise(data.quizId, { skipped: false, resultJson: { sessionId: session.sessionId } }, token);
      router.push(`/practice/${session.sessionId}`);
    } catch (e: unknown) {
      setActionError(errorText(e, "Could not start quiz"));
      setBusy(null);
    }
  }

  async function skipQuiz() {
    if (!data?.quizId) return;
    setBusy("skip");
    setActionError(null);
    try {
      await api.completeSurprise(data.quizId, { skipped: true }, token);
      setData({ message: "Skipped — another surprise may appear later.", quiz: null });
    } catch (e: unknown) {
      setActionError(errorText(e, "Could not skip"));
    } finally {
      setBusy(null);
    }
  }

  const ready = Boolean(data?.quizId);

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Practice" title="Surprise check" description="Two quick questions. No pressure — it just helps things stick." />

      {failure ? (
        <FailureView failure={failure} />
      ) : !data ? (
        <LoadingState />
      ) : !ready ? (
        <EmptyState
          title="No surprise ready"
          body={data.message || "Check back after a bit of practice."}
          action={<ButtonLink href="/practice">Go to practice</ButtonLink>}
        />
      ) : (
        <Card className="animate-rise p-6 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
            <Lightning size={28} weight="fill" />
          </span>
          <p className="mt-4 text-body-lg font-semibold text-neutral-900">{data.prompt || "Quick check — ready for a 2-question surprise quiz?"}</p>
          {data.reason && (
            <div className="mt-2 flex justify-center">
              <Badge tone="teal">{REASON_COPY[data.reason] || data.reason}</Badge>
            </div>
          )}
          {actionError && (
            <Callout tone="danger" className="mt-5 text-left">
              {actionError}
            </Callout>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" loading={busy === "start"} disabled={busy !== null} onClick={startQuiz}>
              Start quiz
            </Button>
            <Button variant="tertiary" size="lg" loading={busy === "skip"} disabled={busy !== null} onClick={skipQuiz}>
              Skip for now
            </Button>
          </div>
        </Card>
      )}
    </AppPage>
  );
}
