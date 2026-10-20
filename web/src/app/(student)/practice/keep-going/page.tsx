"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, Coffee, Path } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Field, Input, PageHeader } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView, OptionList, ProgressBar, Switch } from "@/components/student/StudentUI";
import {
  errorText,
  isRecord,
  num,
  parseOptions,
  plural,
  questionTypeLabel,
  str,
  toFailure,
  type LoadFailure,
} from "@/components/student/studentData";
import * as api from "@/lib/api/w4";

type Question = { questionId: string | number; questionText: string; questionType: string; marksAvailable: number | null; optionsJson: unknown };
type KeepGoing = { consistent: boolean; stopForFatigue: boolean; keepGoing: boolean; answered: number | null; windowSize: number | null; minPct: number | null };

/** GET /practice/sessions/{id}/next returns `{ question: {...}, done }` (the question is nested). */
function parseNext(res: unknown): Question | null {
  if (!isRecord(res) || res.done === true) return null;
  const q = isRecord(res.question) ? res.question : res;
  const id = q.questionId;
  if (id == null) return null;
  return {
    questionId: typeof id === "number" ? id : str(id),
    questionText: str(q.questionText, "Question"),
    questionType: str(q.questionType),
    marksAvailable: num(q.marksAvailable),
    optionsJson: q.optionsJson,
  };
}

function parseKeepGoing(v: unknown): KeepGoing | null {
  if (!isRecord(v)) return null;
  return {
    consistent: v.consistent === true,
    stopForFatigue: v.stopForFatigue === true,
    keepGoing: v.keepGoing === true,
    answered: num(v.answered ?? v.answeredCount),
    windowSize: num(v.windowSize),
    minPct: num(v.minPct),
  };
}

/** D-10 Target-grade keep-going drill */
export default function KeepGoingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<KeepGoing | null>(null);
  const [simplified, setSimplified] = useState(false);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  async function start() {
    setBusy(true);
    setFailure(null);
    try {
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("enrolmentId required");
      const s: unknown = await api.startKeepGoing({ enrolmentId, plannedCount: 30 });
      const sid = isRecord(s) ? str(s.sessionId) : "";
      setSessionId(sid);
      const next = parseNext(await api.practiceNext(sid));
      setItem(next);
      if (!next) setFinished(true);
    } catch (e: unknown) {
      const f = toFailure(e, "Could not start");
      setFailure(f.message === "enrolmentId required" ? { kind: "error", message: "No active subject yet — open Home first." } : f);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!sessionId || !item) return;
    setBusy(true);
    setAnswerError(null);
    try {
      const isMcq = item.questionType === "MULTIPLE_CHOICE";
      const r: unknown = await api.practiceAnswer(sessionId, {
        questionId: item.questionId,
        answerText: answer,
        // MCQ marking reads the structured answer; text answers keep using answerText as before.
        ...(isMcq ? { answer: { type: "MCQ", optionId: answer } } : {}),
      });
      const kg = parseKeepGoing(isRecord(r) ? r.keepGoing : null);
      setStatus(kg);
      setAnswer("");
      if (kg && (kg.consistent || kg.stopForFatigue)) {
        setItem(null);
        setFinished(true);
      } else {
        const next = parseNext(await api.practiceNext(sessionId));
        setItem(next);
        if (!next) setFinished(true);
      }
    } catch (e: unknown) {
      setAnswerError(errorText(e, "Answer failed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSimplified() {
    if (!sessionId) return;
    const next = !simplified;
    try {
      await api.setPracticeMode(sessionId, { simplifiedLanguage: next });
      setSimplified(next);
    } catch (e) {
      setAnswerError(errorText(e, "Couldn't change the language setting."));
    }
  }

  const options = item ? parseOptions(item.optionsJson) : [];
  const answered = status?.answered ?? 0;
  const windowSize = status?.windowSize ?? 5;

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Practice"
        title="Keep going"
        description="An adaptive drill at your target grade. It stops by itself once you’re answering consistently — or when it’s time for a break."
      />

      {failure && (
        <div className="mb-6">
          <FailureView failure={failure} action={<ButtonLink href="/home" variant="secondary" size="sm">Go to Home</ButtonLink>} />
        </div>
      )}

      {!sessionId && (
        <Card className="flex flex-wrap items-center gap-5 p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy">
            <Path size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-neutral-900">Up to 30 questions</p>
            <p className="text-[14px] text-neutral-600">Most people finish sooner. No timer, no pressure.</p>
          </div>
          <Button size="lg" onClick={start} loading={busy} icon={<ArrowRight size={18} />}>
            Start drill
          </Button>
        </Card>
      )}

      {sessionId && !finished && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tabular text-[14px] text-neutral-600" aria-live="polite">
              {plural(answered, "question")} answered
            </p>
            {status && (
              <Badge tone={status.keepGoing ? "brand" : "teal"}>{status.keepGoing ? "Building consistency" : "Nearly there"}</Badge>
            )}
          </div>
          <ProgressBar value={Math.min(answered, windowSize)} max={windowSize} label="Progress towards consistency" />

          {busy && !item ? (
            <LoadingState label="Loading question…" />
          ) : (
            item && (
              <Card className="animate-rise p-6 shadow-raised">
                <div className="flex items-center justify-between text-caption text-neutral-600">
                  <Badge>{questionTypeLabel(item.questionType)}</Badge>
                  {item.marksAvailable != null && <span>{plural(item.marksAvailable, "mark")}</span>}
                </div>
                <p className="mt-4 text-body-lg font-medium text-neutral-900">{item.questionText}</p>
                <div className="mt-5">
                  {options.length > 0 ? (
                    <OptionList options={options} value={answer} onChange={setAnswer} disabled={busy} />
                  ) : (
                    <Field label="Your answer" htmlFor="kg-answer">
                      <Input id="kg-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Practice answer" autoComplete="off" />
                    </Field>
                  )}
                </div>
                {answerError && (
                  <Callout tone="danger" className="mt-4">
                    {answerError}
                  </Callout>
                )}
                <div className="mt-6 flex justify-end">
                  <Button onClick={submit} disabled={!answer.trim()} loading={busy}>
                    Submit answer
                  </Button>
                </div>
              </Card>
            )
          )}

          <Card className="px-5">
            <Switch
              id="kg-simplified"
              label="Simplified language"
              description="Plainer wording. Your marks never change."
              checked={simplified}
              onChange={() => void toggleSimplified()}
            />
          </Card>
        </div>
      )}

      {finished && (
        <Card className="animate-rise p-6 text-center sm:p-8" aria-live="polite">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
            {status?.stopForFatigue ? <Coffee size={24} /> : <CheckCircle size={24} weight="fill" />}
          </span>
          <h2 className="mt-3 text-h2">
            {status?.consistent ? "Consistency reached" : status?.stopForFatigue ? "Time for a break" : "That’s all for now"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-neutral-600">
            {status?.consistent
              ? "You answered consistently at your target level. Great work."
              : status?.stopForFatigue
                ? "A few in a row were tough — a short break helps it stick. Come back later."
                : "There are no more questions in this drill right now."}
          </p>
          {answered > 0 && <p className="tabular mt-3 text-[14px] text-neutral-600">{plural(answered, "question")} answered</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/practice">Back to practice</ButtonLink>
            <ButtonLink href="/practice/redrill" variant="secondary">
              Redrill missed questions
            </ButtonLink>
          </div>
        </Card>
      )}
    </AppPage>
  );
}
