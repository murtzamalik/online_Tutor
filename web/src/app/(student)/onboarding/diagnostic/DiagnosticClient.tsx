"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  diagnosticAnswer,
  diagnosticNext,
  diagnosticResult,
  startDiagnostic,
  NextQuestionSchema,
} from "@/lib/api/practice";
import { listEnrolments } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { z } from "zod";

type NextQ = z.infer<typeof NextQuestionSchema>;

/** B-06 — Diagnostic */
export default function DiagnosticPage() {
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";
  const [enrolmentId, setEnrolmentId] = useState(params.get("enrolmentId") ?? "");
  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let eid = enrolmentId;
        if (!eid && studentId) {
          const list = await listEnrolments(studentId);
          eid = list.items[0]?.enrolmentId ?? "";
          setEnrolmentId(eid);
        }
        if (!eid) {
          setStatus("error");
          setMessage("Enrol in a subject first.");
          return;
        }
        setStatus("loading");
        const started = await startDiagnostic(eid);
        setDiagnosticId(started.diagnosticId);
        setSessionId(started.sessionId);
        const next = await diagnosticNext(started.diagnosticId);
        setCurrent(next);
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Could not start diagnostic.");
      }
    })();
  }, [studentId, enrolmentId]);

  async function submit() {
    if (!diagnosticId || !current) return;
    setStatus("loading");
    try {
      const q = current.question;
      const payload =
        q.questionType === "MULTIPLE_CHOICE"
          ? { type: "MCQ", optionId: answer }
          : q.questionType === "CALCULATION"
            ? { type: "NUMBER", value: Number(answer) }
            : { type: "TEXT", text: answer };
      await diagnosticAnswer(
        diagnosticId,
        { questionId: q.questionId, answer: payload },
        crypto.randomUUID(),
      );
      const next = await diagnosticNext(diagnosticId);
      if (next.done) {
        const res = await diagnosticResult(diagnosticId);
        setResult(res as unknown as Record<string, unknown>);
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

  const options = Array.isArray(current?.question.optionsJson)
    ? (current!.question.optionsJson as { key: string; text: string }[])
    : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Placement diagnostic</h1>
      <p className="mt-2 text-ink/70">A short adaptive check to seed mastery.</p>
      {status === "loading" && <div className="mt-8"><LoadingState /></div>}
      {status === "error" && <div className="mt-8"><ErrorState body={message} /></div>}
      {current && status !== "loading" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink/60">
            {current.question.questionType} · {current.question.marksAvailable} mark
            {current.question.marksAvailable === 1 ? "" : "s"}
          </p>
          <p className="text-lg">{current.question.questionText}</p>
          {options.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">Options</legend>
              {options.map((o) => (
                <label key={o.key} className="flex items-center gap-2 rounded-md border border-mist bg-white px-3 py-2">
                  <input
                    type="radio"
                    name="opt"
                    value={o.key}
                    checked={answer === o.key}
                    onChange={() => setAnswer(o.key)}
                  />
                  <span>
                    {o.key}. {o.text}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label className="block text-sm font-semibold">
              Your answer
              <input
                className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </label>
          )}
          <Button onClick={submit} disabled={!answer}>
            Submit
          </Button>
        </div>
      )}
      {status === "done" && result && (
        <div className="mt-8 space-y-3">
          <p className="text-success">Diagnostic complete. Theta: {String(result.theta ?? "—")}</p>
          {sessionId && (
            <Link className="inline-block font-semibold text-accent underline" href={`/practice/${sessionId}`}>
              Continue to practice (same session)
            </Link>
          )}
          {enrolmentId && (
            <div>
              <Button
                onClick={async () => {
                  const { startPractice } = await import("@/lib/api/practice");
                  const s = await startPractice({ enrolmentId, mode: "MIXED", plannedCount: 5 });
                  window.location.href = `/practice/${s.sessionId}`;
                }}
              >
                Start practice
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
