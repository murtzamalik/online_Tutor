"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import {
  diagnosticAnswer,
  diagnosticNext,
  diagnosticResult,
  startDiagnostic,
  startPractice,
  NextQuestionSchema,
} from "@/lib/api/practice";
import { listEnrolments } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Callout, Card, Field, Input, KeyValue } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { OptionList, StepHeader } from "@/components/student/StudentUI";
import { num, parseOptions, plural, questionTypeLabel, str } from "@/components/student/studentData";
import { z } from "zod";

type NextQ = z.infer<typeof NextQuestionSchema>;
type DiagResult = Awaited<ReturnType<typeof diagnosticResult>>;

/** B-06 — Diagnostic */
export default function DiagnosticPage() {
  const params = useSearchParams();
  const studentId =
    params.get("studentId") ?? (typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null) ?? "";
  const [enrolmentId, setEnrolmentId] = useState(
    () => params.get("enrolmentId") ?? (typeof window !== "undefined" ? sessionStorage.getItem("enrolmentId") : null) ?? "",
  );
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "submitting" | "error" | "done">("loading");
  const [message, setMessage] = useState("");
  const [needsEnrolment, setNeedsEnrolment] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [startingPractice, setStartingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  // Guard: resolving the enrolment updates state, which must not start a second diagnostic.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const sid = studentId || sessionStorage.getItem("studentId") || "";
        let eid = enrolmentId || sessionStorage.getItem("enrolmentId") || "";
        if (!eid && sid) {
          const list = await listEnrolments(sid);
          eid = list.items[0]?.enrolmentId ?? "";
          setEnrolmentId(eid);
          if (eid) sessionStorage.setItem("enrolmentId", eid);
        }
        if (!eid) {
          setStatus("error");
          setNeedsEnrolment(true);
          setMessage("Enrol in a subject first.");
          return;
        }
        setStatus("loading");
        const s = await startDiagnostic(eid);
        setDiagnosticId(s.diagnosticId);
        setSessionId(s.sessionId);
        const next = await diagnosticNext(s.diagnosticId);
        if (next.done) {
          setResult(await diagnosticResult(s.diagnosticId));
          setStatus("done");
          return;
        }
        setCurrent(next);
        setStatus("idle");
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Could not start diagnostic.");
      }
    })();
  }, [studentId, enrolmentId]);

  async function submit() {
    if (!diagnosticId || !current) return;
    setStatus("submitting");
    try {
      const q = current.question;
      const payload =
        q.questionType === "MULTIPLE_CHOICE"
          ? { type: "MCQ", optionId: answer }
          : q.questionType === "CALCULATION"
            ? { type: "NUMBER", value: Number(answer) }
            : { type: "TEXT", text: answer };
      await diagnosticAnswer(diagnosticId, { questionId: q.questionId, answer: payload }, crypto.randomUUID());
      setAnsweredCount((n) => n + 1);
      const next = await diagnosticNext(diagnosticId);
      if (next.done) {
        const res = await diagnosticResult(diagnosticId);
        setResult(res);
        setStatus("done");
        setCurrent(null);
      } else {
        setCurrent(next);
        setAnswer("");
        setStatus("idle");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Submit failed.");
    }
  }

  async function goPractice() {
    if (!enrolmentId) return;
    setStartingPractice(true);
    setPracticeError(null);
    try {
      const s = await startPractice({ enrolmentId, mode: "MIXED", plannedCount: 5 });
      window.location.href = `/practice/${s.sessionId}`;
    } catch (err) {
      setPracticeError(err instanceof ApiError ? err.message : "Could not start practice.");
      setStartingPractice(false);
    }
  }

  const q = current?.question;
  const options = parseOptions(q?.optionsJson);
  const isCalc = q?.questionType === "CALCULATION";
  const seq = current?.seq ?? answeredCount + 1;

  return (
    <AppPage width="content">
      <StepHeader step={4} title="Placement diagnostic" description="A short adaptive check so we know where to start. There’s no pass or fail." />

      {status === "loading" && <LoadingState label="Getting your first question…" lines={4} />}

      {status === "error" &&
        (forbidden ? (
          <ForbiddenState body="The diagnostic is only available on a student login." />
        ) : needsEnrolment ? (
          <EmptyState
            title="Choose a subject first"
            body="The diagnostic is built from your subject, so enrol on one first."
            action={<ButtonLink href={studentId ? `/onboarding/subjects?studentId=${studentId}` : "/onboarding/subjects"}>Choose subjects</ButtonLink>}
          />
        ) : (
          <ErrorState body={message} action={<ButtonLink href="/home" variant="secondary" size="sm">Back to Home</ButtonLink>} />
        ))}

      {current && q && (status === "idle" || status === "submitting") && (
        <Card className="animate-rise p-6 shadow-raised">
          <div className="flex items-center justify-between text-caption text-neutral-600">
            <span className="inline-flex items-center gap-2">
              <Badge>{questionTypeLabel(q.questionType)}</Badge>
              {plural(q.marksAvailable, "mark")}
            </span>
            <span className="tabular">Question {seq}</span>
          </div>
          <p className="mt-4 text-body-lg font-medium text-neutral-900">{q.questionText}</p>
          <div className="mt-5">
            {options.length > 0 ? (
              <OptionList options={options} value={answer} onChange={setAnswer} disabled={status === "submitting"} />
            ) : (
              <Field label={isCalc ? "Your answer (number)" : "Your answer"} htmlFor="diag-answer">
                <Input
                  id="diag-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  inputMode={isCalc ? "decimal" : "text"}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && answer) void submit();
                  }}
                />
              </Field>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-caption text-neutral-600">Not sure? Give it your best guess.</p>
            <Button onClick={submit} disabled={!answer} loading={status === "submitting"}>
              Submit answer
            </Button>
          </div>
        </Card>
      )}

      {status === "done" && result && (
        <div className="animate-rise space-y-6" aria-live="polite">
          <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <CheckCircle size={28} weight="fill" className="shrink-0 text-brand-teal" />
              <div>
                <h2 className="text-h2">Diagnostic complete</h2>
                <p className="mt-1 text-neutral-600">Thanks — your practice now starts at the right level for you.</p>
              </div>
            </div>
            <KeyValue className="mt-5" items={resultRows(result, answeredCount)} />
          </Card>
          {practiceError && <Callout tone="danger" title="Practice didn’t start">{practiceError}</Callout>}
          <div className="flex flex-wrap items-center gap-3">
            {enrolmentId && (
              <Button size="lg" onClick={goPractice} loading={startingPractice} icon={<ArrowRight size={18} />}>
                Start practice
              </Button>
            )}
            <ButtonLink href="/onboarding/plan" variant="secondary">
              Next: your weekly plan
            </ButtonLink>
            {sessionId && (
              <Link className="text-[14px] font-semibold text-brand-navy hover:underline" href={`/practice/${sessionId}`}>
                Continue to practice (same session)
              </Link>
            )}
          </div>
        </div>
      )}
    </AppPage>
  );
}

function resultRows(result: DiagResult, answeredCount: number): Array<[ReactNode, ReactNode]> {
  const rows: Array<[ReactNode, ReactNode]> = [];
  if (answeredCount > 0) rows.push(["Questions answered", <span className="tabular">{answeredCount}</span>]);
  if (result.recommendedTier) rows.push(["Recommended tier", tierLabel(result.recommendedTier)]);
  const seeded = num(result.topicsSeeded);
  if (seeded != null) rows.push(["Topics set up", <span className="tabular">{seeded}</span>]);
  return rows;
}

function tierLabel(t: string): string {
  const s = str(t).toUpperCase();
  if (s === "HIGHER") return "Higher";
  if (s === "FOUNDATION") return "Foundation";
  return s.charAt(0) + s.slice(1).toLowerCase();
}
