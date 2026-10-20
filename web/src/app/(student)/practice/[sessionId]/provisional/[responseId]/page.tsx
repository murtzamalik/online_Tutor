"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Hourglass, UserCircleCheck } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { pollResult } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { FeedbackPanel, type MarkResult } from "@/components/student/FeedbackPanel";
import { cx } from "@/components/ui/cx";

type ReviewStatus = {
  status?: string;
  provisionalMarks?: number | null;
  dueAt?: string | null;
  etaHours?: number;
  message?: string;
  feature?: string;
};

/** F-09 — A-Level provisional mark with reviewer status. */
export default function ProvisionalPage() {
  const { sessionId, responseId } = useParams<{ sessionId: string; responseId: string }>();
  const [review, setReview] = useState<ReviewStatus | null>(null);
  const [result, setResult] = useState<MarkResult | null>(null);
  const [error, setError] = useState<{ forbidden: boolean; text: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken") ?? undefined;
    (async () => {
      try {
        const [r, res] = await Promise.all([api.reviewStatus(responseId, token), pollResult(responseId)]);
        setReview(r as ReviewStatus);
        setResult(res as MarkResult);
      } catch (e) {
        setError({ forbidden: e instanceof ApiError && e.status === 403, text: e instanceof ApiError ? e.message : "We couldn’t load this mark." });
      }
    })();
  }, [responseId]);

  const confirmed = ["CONFIRMED", "COMPLETED", "RESOLVED"].includes(String(review?.status ?? ""));
  const steps = [
    { label: "Marked by AI", done: true, Icon: CheckCircle },
    { label: "Examiner review", done: confirmed, Icon: UserCircleCheck },
    { label: "Mark confirmed", done: confirmed, Icon: CheckCircle },
  ];

  return (
    <AppPage width="content">
      <PageHeader title="Provisional mark" description="A-Level answers are checked by an examiner before the mark counts towards your progress." actions={<ButtonLink href={`/practice/${sessionId}`} size="sm">Next question</ButtonLink>} />
      {error ? (
        error.forbidden ? <ForbiddenState /> : <ErrorState body={error.text} />
      ) : !review || !result ? (
        <LoadingState />
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy"><Hourglass size={22} /></span>
                <div>
                  <p className="font-semibold text-neutral-900">{confirmed ? "Your mark has been confirmed" : "Waiting for an examiner"}</p>
                  <p className="text-[14px] text-neutral-600">
                    {review.message ?? "This mark is provisional until an examiner confirms it."}
                    {review.dueAt && !confirmed && ` Expected by ${new Date(review.dueAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`}
                  </p>
                </div>
              </div>
              <Badge tone={confirmed ? "success" : "warning"}>{confirmed ? "Confirmed" : "Provisional"}</Badge>
            </div>
            <ol className="mt-5 grid grid-cols-3 gap-2">
              {steps.map((s) => (
                <li key={s.label} className={cx("flex flex-col items-center gap-1 rounded-md px-2 py-3 text-center text-caption font-semibold", s.done ? "bg-brand-tealSoft text-brand-teal" : "bg-neutral-050 text-neutral-400")}>
                  <s.Icon size={20} weight={s.done ? "fill" : "regular"} />
                  {s.label}
                </li>
              ))}
            </ol>
          </Card>
          <FeedbackPanel result={result} responseId={responseId} />
        </>
      )}
    </AppPage>
  );
}
