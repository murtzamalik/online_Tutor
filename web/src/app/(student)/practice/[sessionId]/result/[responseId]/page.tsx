"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMarking, pollResult } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { FeedbackPanel, type MarkResult } from "@/components/student/FeedbackPanel";

/** F-01 — Marking result (deep link; the practice screen shows the same panel inline). */
export default function PracticeResultPage() {
  const { sessionId, responseId } = useParams<{ sessionId: string; responseId: string }>();
  const router = useRouter();
  const [data, setData] = useState<MarkResult | null>(null);
  const [questionId, setQuestionId] = useState<string | number | null>(null);
  const [error, setError] = useState<{ forbidden: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData((await pollResult(responseId)) as MarkResult);
        const m = await getMarking(responseId);
        if (typeof m.questionId === "string" || typeof m.questionId === "number") setQuestionId(m.questionId);
      } catch (err) {
        setError({
          forbidden: err instanceof ApiError && err.status === 403,
          text: err instanceof ApiError ? err.message : "We couldn’t load this result.",
        });
      }
    })();
  }, [responseId]);

  return (
    <AppPage width="content">
      <PageHeader title="Your marks" description="How your answer was marked, point by point." actions={<ButtonLink href="/practice" variant="tertiary" size="sm">All practice</ButtonLink>} />
      {error ? (
        error.forbidden ? <ForbiddenState /> : <ErrorState body={error.text} />
      ) : !data ? (
        <LoadingState label="Loading marks…" />
      ) : (
        <FeedbackPanel result={data} responseId={responseId} questionId={questionId} onNext={() => router.push(`/practice/${sessionId}`)} />
      )}
    </AppPage>
  );
}
