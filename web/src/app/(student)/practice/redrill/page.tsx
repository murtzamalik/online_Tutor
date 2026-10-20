"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { asArray, errorText, isRecord, num, plural, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";
import { startPractice } from "@/lib/api/practice";

type WrongItem = {
  responseId?: string;
  questionId?: number;
  questionText?: string;
  marksAwarded?: number;
  marksAvailable?: number;
};

function parseItems(res: unknown): WrongItem[] {
  const items = isRecord(res) ? asArray(res.items) : [];
  return items.filter(isRecord).map((i) => ({
    responseId: i.responseId ? str(i.responseId) : undefined,
    questionId: num(i.questionId) ?? undefined,
    questionText: i.questionText ? str(i.questionText) : undefined,
    marksAwarded: num(i.marksAwarded) ?? undefined,
    marksAvailable: num(i.marksAvailable) ?? undefined,
  }));
}

/** D-09 — Wrong-answers redrill */
export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState<WrongItem[] | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFailure(null);
    setItems(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const studentId = sessionStorage.getItem("studentId");
      if (!studentId) throw new Error("Sign in");
      const result: unknown = await api.wrongAnswers(studentId, token);
      setItems(parseItems(result));
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startRedrill() {
    setBusy(true);
    setStartError(null);
    try {
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("No active enrolment — open Home first");
      const session = await startPractice({
        enrolmentId,
        mode: "WRONG_ONLY",
        plannedCount: Math.min(items?.length || 5, 10),
      });
      router.push(`/practice/${session.sessionId}`);
    } catch (e: unknown) {
      setStartError(errorText(e, "Could not start redrill"));
      setBusy(false);
    }
  }

  const count = items?.length ?? 0;

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Practice" title="Redrill missed questions" description="Another go at questions that didn’t get full marks. Each one leaves this list once you nail it." />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : items === null ? (
        <LoadingState lines={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing to redrill"
          body="Keep practising — any question you miss will appear here for another go."
          action={<ButtonLink href="/practice">Go to practice</ButtonLink>}
        />
      ) : (
        <div className="animate-rise space-y-6">
          <Card className="flex flex-wrap items-center gap-5 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy">
              <ArrowCounterClockwise size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-900">{plural(count, "question")} ready for another go</p>
              <p className="text-[14px] text-neutral-600">We’ll pick up to {Math.min(count || 5, 10)} for this session.</p>
            </div>
            <Button size="lg" onClick={startRedrill} loading={busy}>
              Start redrill
            </Button>
          </Card>
          {startError && <Callout tone="danger" title="Redrill didn’t start">{startError}</Callout>}

          <Card>
            <CardHeader title="Your list" description={count > 20 ? "Showing the 20 most recent." : undefined} />
            <ol className="divide-y divide-neutral-100">
              {items.slice(0, 20).map((item, i) => (
                <li key={item.responseId ?? `${item.questionId}-${i}`} className="flex items-start gap-4 px-5 py-4">
                  <span className="tabular mt-0.5 w-6 shrink-0 text-caption font-semibold text-neutral-400">{i + 1}</span>
                  <p className="min-w-0 flex-1 line-clamp-2 text-[15px] text-neutral-900">{item.questionText || `Question ${item.questionId}`}</p>
                  <span className="tabular shrink-0 rounded-full bg-[#FBF3DF] px-2.5 py-0.5 text-caption font-semibold text-[#8A6508]">
                    {item.marksAwarded ?? 0} / {item.marksAvailable ?? "—"}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </AppPage>
  );
}
