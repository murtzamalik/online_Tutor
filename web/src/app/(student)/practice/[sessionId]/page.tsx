"use client";

import { EngagementOverlays } from "@/components/engagement/EngagementOverlays";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Books, Lightbulb, Sparkle, Timer, Trophy } from "@phosphor-icons/react";
import { endSession, nextQuestion, pollResult, requestHint, submitAnswer, NextQuestionSchema } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Card, Field, Input, Textarea } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { FeedbackPanel, type MarkResult } from "@/components/student/FeedbackPanel";
import { z } from "zod";

type NextQ = z.infer<typeof NextQuestionSchema>;
type Phase = "loading" | "answering" | "marking" | "feedback" | "error" | "done";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  SHORT_ANSWER: "Short answer",
  CALCULATION: "Calculation",
  EXTENDED_WRITTEN: "Extended response",
  PRACTICAL_BASED: "Practical",
};

/** D-01 practice question card (Design System §7.2) + D-12 structured fields for CALCULATION. */
export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [current, setCurrent] = useState<NextQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("");
  const [sigFigs, setSigFigs] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ responseId: string; data: MarkResult } | null>(null);
  const [answered, setAnswered] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [nothingToServe, setNothingToServe] = useState(false);
  const shownAny = useRef(false);
  const [score, setScore] = useState({ awarded: 0, available: 0 });
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const loadNext = useCallback(async () => {
    setPhase("loading");
    setHint(null);
    setAnswer("");
    setUnit("");
    setSigFigs("");
    setResult(null);
    try {
      const next = await nextQuestion(sessionId);
      if (next.done) {
        // Done before any question was shown: this session had nothing to serve (e.g. a topic with no questions yet).
        if (!shownAny.current) setNothingToServe(true);
        setCurrent(null);
        setPhase("done");
        return;
      }
      shownAny.current = true;
      setCurrent(next);
      setPhase("answering");
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof ApiError ? err.message : "We couldn’t load the next question.");
    }
  }, [sessionId]);

  // nextQuestion() consumes a question server-side, so the first load must run exactly once
  // (React Strict Mode runs effects twice in development).
  const firstLoad = useRef(false);
  useEffect(() => {
    if (firstLoad.current) return;
    firstLoad.current = true;
    void loadNext();
  }, [loadNext]);

  async function onSubmit() {
    if (!current || !answer.trim()) return;
    setPhase("marking");
    try {
      const q = current.question;
      let payload: Record<string, unknown>;
      if (q.questionType === "MULTIPLE_CHOICE") {
        payload = { type: "MCQ", optionId: answer };
      } else if (q.questionType === "CALCULATION") {
        payload = {
          type: "NUMBER",
          value: Number(answer),
          unit: unit || undefined,
          sigFigs: sigFigs ? Number(sigFigs) : undefined,
          structured: { value: Number(answer), unit: unit || null, sigFigs: sigFigs || null },
        };
      } else {
        payload = { type: "TEXT", text: answer };
      }
      const submitted = await submitAnswer(sessionId, { questionId: q.questionId, answer: payload, confidence: "MEDIUM" }, crypto.randomUUID());
      let res = await pollResult(submitted.responseId);
      for (let i = 0; i < 20 && (res.status === "MARKING" || res.status === "PENDING"); i++) {
        await new Promise((r) => setTimeout(r, 500));
        res = await pollResult(submitted.responseId);
      }
      setResult({ responseId: submitted.responseId, data: res as MarkResult });
      setAnswered((n) => n + 1);
      const got = Number(res.marks?.awarded ?? 0);
      const max = Number(res.marks?.available ?? q.marksAvailable);
      setWrongStreak((w) => (got >= max && max > 0 ? 0 : w + 1));
      setScore((s) => ({
        awarded: s.awarded + Number(res.marks?.awarded ?? 0),
        available: s.available + Number(res.marks?.available ?? q.marksAvailable),
      }));
      setPhase("feedback");
    } catch (err) {
      setPhase("answering");
      setMessage(err instanceof ApiError ? err.message : "We couldn’t mark that answer. Your answer is still here — try again.");
    }
  }

  async function onHint() {
    if (!current) return;
    setHintLoading(true);
    try {
      const h = await requestHint(sessionId, current.question.questionId);
      setHint(h.hintText);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No hint is available for this question.");
    } finally {
      setHintLoading(false);
    }
  }

  async function onEnd() {
    try {
      await endSession(sessionId);
    } catch {
      // Ending is best-effort; the summary is computed locally.
    }
    setPhase("done");
  }

  const q = current?.question;
  const options = Array.isArray(q?.optionsJson) ? (q!.optionsJson as { key: string; text: string }[]) : [];
  const isCalc = q?.questionType === "CALCULATION";
  const isWritten = q && !options.length && !isCalc;
  const qNumber = current?.seq ?? answered + 1;

  if (phase === "error") {
    return (
      <AppPage width="content">
        <ErrorState body={message} action={<Button onClick={loadNext}>Try again</Button>} />
      </AppPage>
    );
  }

  if (phase === "done" && nothingToServe && answered === 0) {
    return (
      <AppPage width="content">
        <Card className="animate-rise p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <Books size={28} />
          </span>
          <h1 className="mt-4 text-h2">No questions here yet</h1>
          <p className="mx-auto mt-1 max-w-md text-neutral-600">
            We’re still writing exam-style questions for this topic. Read the notes for now, or practise a mixed set from the topics that are ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/practice">Practise a mixed set</ButtonLink>
            <ButtonLink href="/revise" variant="secondary">Back to Revise</ButtonLink>
          </div>
        </Card>
      </AppPage>
    );
  }

  if (phase === "done") {
    const pct = score.available > 0 ? Math.round((score.awarded / score.available) * 100) : 0;
    return (
      <AppPage width="content">
        <Card className="animate-rise p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
            <Trophy size={28} weight="fill" />
          </span>
          <h1 className="mt-4 text-h1">Session complete</h1>
          <p className="mt-1 text-neutral-600">
            {answered === 0 ? "No questions answered this time." : `You answered ${answered} question${answered === 1 ? "" : "s"} in ${formatTime(elapsed)}.`}
          </p>
          {answered > 0 && (
            <p className="tabular mt-6 text-[40px] font-bold text-brand-navy">
              {score.awarded % 1 === 0 ? score.awarded : score.awarded.toFixed(1)}/{score.available}
              <span className="ml-2 text-[18px] font-semibold text-neutral-600">({pct}%)</span>
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/practice">Practise again</ButtonLink>
            <ButtonLink href="/student/map" variant="secondary">See my progress</ButtonLink>
          </div>
        </Card>
      </AppPage>
    );
  }

  return (
    <AppPage width="content">
      {/* Context strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-neutral-600">
        <span className="font-semibold text-neutral-900">Practice</span>
        <span>Question {qNumber}</span>
        {answered > 0 && <span className="tabular">Score {score.awarded % 1 === 0 ? score.awarded : score.awarded.toFixed(1)}/{score.available}</span>}
        <span className="tabular ml-auto inline-flex items-center gap-1"><Timer size={15} /> {formatTime(elapsed)}</span>
        <Button size="sm" variant="tertiary" onClick={onEnd}>End session</Button>
      </div>

      <Card className="p-6 sm:p-8">
        {phase === "loading" || !q ? (
          <div className="space-y-4" role="status" aria-label="Loading question">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-6 w-11/12 rounded" />
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="mt-6 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-md" />)}</div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{TYPE_LABEL[q.questionType] ?? q.questionType}</Badge>
              <Badge>{q.marksAvailable} mark{q.marksAvailable === 1 ? "" : "s"}</Badge>
              {q.commandWord && <Badge tone="teal">{q.commandWord}</Badge>}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-body-lg font-medium text-neutral-900">{q.questionText}</p>

            <div className="mt-6">
              {options.length > 0 ? (
                <div role="radiogroup" aria-label="Answer options" className="space-y-2.5">
                  {options.map((o) => {
                    const selected = answer === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={phase !== "answering"}
                        onClick={() => setAnswer(o.key)}
                        className={cx(
                          "flex w-full items-center gap-3 rounded-md border px-4 py-3.5 text-left text-[15px] transition-colors duration-fast disabled:cursor-default",
                          selected ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 bg-white hover:border-neutral-400",
                        )}
                      >
                        <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold", selected ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-400 text-neutral-600")}>
                          {o.key}
                        </span>
                        {o.text}
                      </button>
                    );
                  })}
                </div>
              ) : isCalc ? (
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <Field label="Your answer" htmlFor="calc-value">
                    <Input id="calc-value" inputMode="decimal" value={answer} disabled={phase !== "answering"} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. 0.25" className="tabular" />
                  </Field>
                  <Field label="Unit" htmlFor="calc-unit">
                    <Input id="calc-unit" value={unit} disabled={phase !== "answering"} onChange={(e) => setUnit(e.target.value)} placeholder="mol/dm³" />
                  </Field>
                  <Field label="Sig. figs" htmlFor="calc-sf">
                    <Input id="calc-sf" inputMode="numeric" value={sigFigs} disabled={phase !== "answering"} onChange={(e) => setSigFigs(e.target.value)} placeholder="3" />
                  </Field>
                </div>
              ) : (
                <Field label="Your answer" htmlFor="written" hint={`Answer as you would in the exam — this is worth ${q.marksAvailable} mark${q.marksAvailable === 1 ? "" : "s"}.`}>
                  <Textarea id="written" value={answer} disabled={phase !== "answering"} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="Type your answer…" />
                </Field>
              )}
            </div>

            {hint && (
              <div className="mt-5 flex items-start gap-2.5 rounded-md bg-brand-tealSoft px-4 py-3 text-[14px] text-brand-teal" role="status">
                <Lightbulb size={20} weight="fill" className="mt-0.5 shrink-0" />
                <p><span className="font-semibold">Hint:</span> {hint}</p>
              </div>
            )}
            {message && phase === "answering" && <p className="mt-4 text-[14px] text-answer-incorrect" role="alert">{message}</p>}

            {phase === "answering" && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-5">
                <Button variant="tertiary" onClick={onHint} loading={hintLoading} icon={<Lightbulb size={18} />}>Hint</Button>
                <Button className="ml-auto" size="lg" onClick={() => { setMessage(""); void onSubmit(); }} disabled={!answer.trim()}>
                  Submit answer
                </Button>
              </div>
            )}
            {phase === "marking" && (
              <div className="mt-6 flex items-center gap-3 rounded-md bg-neutral-050 px-4 py-3 text-[14px] text-neutral-700" role="status">
                <Sparkle size={20} className="animate-pulse text-brand-teal" />
                {isWritten ? "Marking your answer against the mark scheme — this can take a few seconds…" : "Checking your answer…"}
              </div>
            )}
          </>
        )}
      </Card>

      {phase === "feedback" && result && q && (
        <FeedbackPanel result={result.data} responseId={result.responseId} questionId={q.questionId} onNext={loadNext} />
      )}

      <EngagementOverlays
        sessionId={typeof sessionId === "string" ? sessionId : undefined}
        answering={phase === "answering"}
        wrongStreak={wrongStreak}
        answeredCount={answered}
      />
    </AppPage>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
