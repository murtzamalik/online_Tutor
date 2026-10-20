"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, LockSimple } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, Field, Input, KeyValue, PageHeader } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView, OptionList, ProgressBar } from "@/components/student/StudentUI";
import { errorText, isRecord, num, parseOptions, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w4";

type Item = {
  questionId: string | number;
  questionText: string;
  optionsJson: unknown;
  answeredCount: number;
  quotaItems: number | null;
  itemIndex: number | null;
};
type Result = { answeredCount: number | null; correctCount: number | null; quotaItems: number | null };

/** /entrance-tests/{id}/next wraps the practice next-question payload: the question itself is nested. */
function parseItem(next: Record<string, unknown>): Item {
  const q = isRecord(next.question) ? next.question : next;
  const id = q.questionId ?? next.questionId;
  return {
    questionId: typeof id === "number" ? id : str(id),
    questionText: str(q.questionText ?? next.questionText, "Question"),
    optionsJson: q.optionsJson,
    answeredCount: num(next.answeredCount) ?? 0,
    quotaItems: num(next.quotaItems),
    itemIndex: num(next.itemIndex),
  };
}

function parseResult(r: unknown): Result {
  const o = isRecord(r) ? r : {};
  return { answeredCount: num(o.answeredCount), correctCount: num(o.correctCount), quotaItems: num(o.quotaItems) };
}

/** D-04 11+ entrance — no skip / no back */
export default function EntrancePage() {
  const params = useParams() as { runId: string };
  const search = useSearchParams();
  const [runId, setRunId] = useState(params.runId === "new" ? "" : params.runId);
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadNext = useCallback(async (id: string) => {
    try {
      const next: unknown = await api.entranceNext(id);
      if (isRecord(next) && next.complete) {
        setResult(parseResult(await api.entranceResult(id)));
        setItem(null);
      } else if (isRecord(next)) {
        setItem(parseItem(next));
      }
    } catch (e) {
      // Reopening a finished run: show its result instead of an error.
      if (e instanceof ApiError && e.code === "RUN_COMPLETE") {
        setResult(parseResult(await api.entranceResult(id)));
        setItem(null);
        return;
      }
      throw e;
    }
  }, []);

  // Starting a run and fetching the next item both change server state, so do it once per run id
  // (Strict Mode runs effects twice in development).
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (startedFor.current === params.runId) return;
    startedFor.current = params.runId;
    const cancelled = false;
    (async () => {
      try {
        let id = params.runId === "new" ? "" : params.runId;
        if (!id) {
          const enrolmentId = search.get("enrolmentId") || sessionStorage.getItem("enrolmentId");
          if (!enrolmentId) throw new Error("enrolmentId required to start entrance test");
          const started: unknown = await api.startEntrance({ enrolmentId, examType: "GRAMMAR" });
          id = isRecord(started) ? str(started.runId) : "";
          if (!cancelled) setRunId(id);
        } else if (!cancelled) {
          setRunId(id);
        }
        await loadNext(id);
      } catch (e: unknown) {
        if (!cancelled) setFailure(toFailure(e, "Could not load entrance test"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per route param
  }, [params.runId]);

  async function submit() {
    if (!runId || !item) return;
    setSubmitting(true);
    setAnswerError(null);
    try {
      const r: unknown = await api.entranceAnswer(runId, {
        questionId: item.questionId,
        answerText: answer,
        itemIndex: item.itemIndex ?? item.answeredCount,
      });
      setAnswer("");
      if (isRecord(r) && r.complete) {
        setResult(parseResult(await api.entranceResult(runId)));
        setItem(null);
      } else {
        await loadNext(runId);
      }
    } catch (e: unknown) {
      setAnswerError(errorText(e, "Answer failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const options = item ? parseOptions(item.optionsJson) : [];
  const position = item ? item.answeredCount + 1 : 0;

  return (
    <AppPage width="content">
      <PageHeader eyebrow="11+ entrance practice" title="Entrance test" description="Just like the real thing: answer each question in turn. You can’t skip or go back." />

      {loading ? (
        <LoadingState label="Preparing your test…" />
      ) : failure ? (
        <FailureView
          failure={failure.message.startsWith("enrolmentId required") ? { kind: "error", message: "No active subject yet — open Home first." } : failure}
          action={<ButtonLink href="/home" variant="secondary" size="sm">Go to Home</ButtonLink>}
        />
      ) : result ? (
        <Card className="animate-rise p-6 text-center sm:p-8" aria-live="polite">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
            <CheckCircle size={26} weight="fill" />
          </span>
          <h2 className="mt-3 text-h2">Entrance test complete</h2>
          <p className="mt-1 text-neutral-600">Well done for sticking with it to the end.</p>
          <KeyValue
            className="mx-auto mt-5 max-w-xs text-left"
            items={[
              ["Questions answered", <span key="a" className="tabular">{result.answeredCount ?? "—"}</span>],
              ["Correct", <span key="c" className="tabular">{result.correctCount ?? "—"}</span>],
            ]}
          />
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/home">Back to Home</ButtonLink>
          </div>
        </Card>
      ) : (
        item && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[14px] text-neutral-600">
              <span className="tabular font-semibold text-neutral-900">
                Question {position}
                {item.quotaItems != null ? ` of ${item.quotaItems}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LockSimple size={16} aria-hidden /> No skip · no back
              </span>
            </div>
            {item.quotaItems != null && <ProgressBar value={item.answeredCount} max={item.quotaItems} label="Test progress" />}
            <Card key={String(item.questionId)} className="animate-rise p-6 shadow-raised">
              <p className="text-body-lg font-medium text-neutral-900">{item.questionText}</p>
              <div className="mt-5">
                {options.length > 0 ? (
                  <OptionList options={options} value={answer} onChange={setAnswer} disabled={submitting} />
                ) : (
                  <Field label="Your answer" htmlFor="entrance-answer">
                    <Input id="entrance-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Entrance answer" autoComplete="off" />
                  </Field>
                )}
              </div>
              {answerError && (
                <Callout tone="danger" className="mt-4">
                  {answerError}
                </Callout>
              )}
              <div className="mt-6 flex justify-end">
                <Button onClick={submit} disabled={!answer.trim()} loading={submitting}>
                  Submit answer
                </Button>
              </div>
            </Card>
          </div>
        )
      )}
    </AppPage>
  );
}
