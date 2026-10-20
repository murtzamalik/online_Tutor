"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Timer } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Field, Textarea } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { FailureView, ProgressBar } from "@/components/student/StudentUI";
import {
  asArray,
  errorText,
  isRecord,
  num,
  plural,
  questionTypeLabel,
  str,
  toDate,
  toFailure,
  type LoadFailure,
} from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type MockItem = { seq: number; section: string; questionId: string; marks: number | null; questionText: string; questionType: string; answerText: string };
type Mock = { mockId: string; status: string; durationMinutes: number; startedAt: Date | null; items: MockItem[] };

function parseMock(raw: unknown): Mock | null {
  if (!isRecord(raw)) return null;
  const items = asArray(raw.items)
    .filter(isRecord)
    .map((i, idx) => ({
      seq: num(i.seq) ?? idx + 1,
      section: str(i.section),
      questionId: str(i.questionId),
      marks: num(i.marks),
      questionText: str(i.questionText, "Question"),
      questionType: str(i.questionType),
      answerText: str(i.answerText),
    }))
    .sort((a, b) => a.seq - b.seq);
  return {
    mockId: str(raw.mockId),
    status: str(raw.status),
    durationMinutes: num(raw.durationMinutes) ?? 45,
    startedAt: toDate(raw.startedAt),
    items,
  };
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** D-03 — Timed mock sitting */
export default function Page() {
  const params = useParams<{ mockId: string }>();
  const router = useRouter();
  const [mock, setMock] = useState<Mock | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const savedRef = useRef<Record<number, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const submittedRef = useRef(false);

  const token = () => sessionStorage.getItem("accessToken") ?? undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mockId = params.mockId;
        let raw: unknown = await api.getMock(mockId, token());
        if (isRecord(raw) && raw.status === "SETUP") raw = await api.startMock(mockId, token());
        const m = parseMock(raw);
        if (cancelled || !m) return;
        setMock(m);
        const initial: Record<number, string> = {};
        m.items.forEach((i) => (initial[i.seq] = i.answerText));
        setAnswers(initial);
        savedRef.current = { ...initial };
        const start = m.startedAt?.getTime() ?? Date.now();
        setDeadline(start + m.durationMinutes * 60_000);
      } catch (e: unknown) {
        if (!cancelled) setFailure(toFailure(e, "Could not load"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.mockId]);

  const inProgress = mock?.status === "IN_PROGRESS";

  useEffect(() => {
    if (!inProgress || deadline == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inProgress, deadline]);

  const saveSeq = useCallback(
    async (seq: number): Promise<boolean> => {
      const text = answers[seq] ?? "";
      if (savedRef.current[seq] === text) return true;
      setSaveState("saving");
      setSaveError(null);
      try {
        await api.saveMockAnswer(params.mockId, seq, { answerText: text }, token());
        savedRef.current[seq] = text;
        setSaveState("saved");
        return true;
      } catch (e) {
        setSaveState("error");
        setSaveError(errorText(e, "Your answer wasn’t saved. Check your connection and try again."));
        return false;
      }
    },
    [answers, params.mockId],
  );

  const submit = useCallback(async () => {
    if (!mock || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      for (const item of mock.items) await saveSeq(item.seq);
      await api.submitMock(params.mockId, token());
      router.push(`/mock/${params.mockId}/results`);
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setConfirming(true);
      setSubmitError(errorText(e, "We couldn’t submit your paper. Your answers are saved — try again."));
    }
  }, [mock, params.mockId, router, saveSeq]);

  const remaining = deadline == null ? null : Math.max(0, Math.round((deadline - now) / 1000));

  useEffect(() => {
    if (inProgress && remaining === 0 && !submittedRef.current) void submit();
  }, [inProgress, remaining, submit]);

  async function go(next: number) {
    if (!mock) return;
    const current = mock.items[index];
    if (current) await saveSeq(current.seq);
    setConfirming(false);
    setIndex(Math.max(0, Math.min(mock.items.length - 1, next)));
  }

  if (failure) {
    return (
      <AppPage width="content">
        <FailureView failure={failure} action={<ButtonLink href="/mock/new" variant="secondary" size="sm">Back to mock setup</ButtonLink>} />
      </AppPage>
    );
  }

  if (!mock) {
    return (
      <AppPage width="content">
        <LoadingState label="Opening your paper…" lines={5} />
      </AppPage>
    );
  }

  if (!inProgress) {
    const done = mock.status === "MARKED" || mock.status === "SUBMITTED";
    return (
      <AppPage width="content">
        <EmptyState
          title={done ? "This paper has been submitted" : "This paper isn’t open"}
          body={done ? "See how you did, topic by topic." : "Set up a new mock paper to start again."}
          action={done ? <ButtonLink href={`/mock/${mock.mockId}/results`}>See results</ButtonLink> : <ButtonLink href="/mock/new">New mock paper</ButtonLink>}
        />
      </AppPage>
    );
  }

  if (mock.items.length === 0) {
    return (
      <AppPage width="content">
        <EmptyState
          title="No questions in this paper"
          body="We couldn’t find approved questions for your subject yet."
          action={<ButtonLink href="/practice">Practise instead</ButtonLink>}
        />
      </AppPage>
    );
  }

  const item = mock.items[index];
  const total = mock.items.length;
  const answeredCount = mock.items.filter((i) => (answers[i.seq] ?? "").trim()).length;
  const unanswered = total - answeredCount;
  const low = remaining != null && remaining <= 300;
  const isLast = index === total - 1;

  return (
    <AppPage width="content" className="pt-0 lg:pt-0">
      {/* Sticky context strip: timer + progress */}
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-neutral-200 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Mock paper</p>
            <p className="tabular text-[15px] font-semibold text-neutral-900">
              Question {index + 1} of {total}
            </p>
          </div>
          <div
            role="timer"
            aria-label={`Time remaining ${clock(remaining ?? 0)}`}
            className={cx(
              "tabular inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[20px] font-bold",
              low ? "bg-[#FBF3DF] text-[#8A6508]" : "bg-white text-neutral-900 shadow-soft",
            )}
          >
            <Timer size={20} aria-hidden />
            {clock(remaining ?? mock.durationMinutes * 60)}
          </div>
        </div>
        <ProgressBar value={answeredCount} max={total} label="Questions answered" className="mt-3" />
        <p className="sr-only" aria-live="polite">
          {remaining === 300 ? "Five minutes left." : remaining === 60 ? "One minute left." : ""}
        </p>
      </div>

      <Card key={item.seq} className="animate-rise p-6 shadow-raised">
        <div className="flex items-center justify-between text-caption text-neutral-600">
          <span className="inline-flex items-center gap-2">
            {item.section && <Badge tone="brand">Section {item.section}</Badge>}
            {questionTypeLabel(item.questionType)}
          </span>
          {item.marks != null && <span className="tabular">[{plural(item.marks, "mark")}]</span>}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-body-lg font-medium text-neutral-900">{item.questionText}</p>
        <Field
          className="mt-5"
          label="Your answer"
          htmlFor={`mock-answer-${item.seq}`}
          hint={item.questionType === "MULTIPLE_CHOICE" ? "Type the letter of your answer, for example B." : "Write as you would in the exam."}
        >
          <Textarea
            id={`mock-answer-${item.seq}`}
            value={answers[item.seq] ?? ""}
            onChange={(e) => {
              setSaveState("idle");
              setAnswers((a) => ({ ...a, [item.seq]: e.target.value }));
            }}
            onBlur={() => void saveSeq(item.seq)}
            className={item.questionType === "MULTIPLE_CHOICE" ? "min-h-[64px]" : "min-h-[180px]"}
          />
        </Field>
        <p className="mt-2 h-5 text-caption text-neutral-600" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </p>
        {saveState === "error" && saveError && (
          <Callout tone="danger" className="mt-2">
            {saveError}
          </Callout>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => void go(index - 1)} disabled={index === 0 || submitting} icon={<ArrowLeft size={18} />}>
          Previous
        </Button>
        {isLast ? (
          <Button onClick={() => setConfirming(true)} disabled={submitting}>
            Finish paper
          </Button>
        ) : (
          <Button onClick={() => void go(index + 1)} disabled={submitting}>
            Next <ArrowRight size={18} />
          </Button>
        )}
      </div>

      {/* Question navigator */}
      <nav aria-label="Jump to question" className="mt-6">
        <ol className="flex flex-wrap gap-2">
          {mock.items.map((q, i) => {
            const answered = !!(answers[q.seq] ?? "").trim();
            return (
              <li key={q.seq}>
                <button
                  type="button"
                  onClick={() => void go(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ""}`}
                  className={cx(
                    "tabular flex h-10 w-10 items-center justify-center rounded-md border text-[14px] font-semibold transition-colors duration-fast",
                    i === index
                      ? "border-brand-navy bg-brand-navy text-white"
                      : answered
                        ? "border-brand-navy/30 bg-brand-navySoft text-brand-navy"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {(confirming || submitting) && (
        <Card className="mt-6 animate-slide-up border-brand-navy/25 p-5" role="region" aria-label="Submit paper">
          <div className="flex items-start gap-3">
            <CheckCircle size={22} className="mt-0.5 shrink-0 text-brand-navy" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-900">{remaining === 0 ? "Time’s up — submitting your paper" : "Submit your paper?"}</p>
              <p className="mt-0.5 text-[14px] text-neutral-600">
                {unanswered > 0 ? `${plural(unanswered, "question")} still blank. ` : "Every question has an answer. "}
                You can’t change answers after submitting.
              </p>
              {submitError && (
                <Callout tone="danger" className="mt-3">
                  {submitError}
                </Callout>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void submit()} loading={submitting}>
                  Submit paper
                </Button>
                {!submitting && (
                  <Button variant="tertiary" onClick={() => setConfirming(false)}>
                    Keep working
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </AppPage>
  );
}
