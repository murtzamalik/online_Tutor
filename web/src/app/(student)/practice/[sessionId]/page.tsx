"use client";

import { EngagementOverlays } from "@/components/engagement/EngagementOverlays";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  endSession,
  nextQuestion,
  pollResult,
  requestHint,
  submitAnswer,
  NextQuestionSchema,
} from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { z } from "zod";

type NextQ = z.infer<typeof NextQuestionSchema>;

/** D-01 practice (+ D-12 chem structured fields for CALCULATION) */
export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [current, setCurrent] = useState<NextQ | null>(null);
  const [answer, setAnswer] = useState("");
  const [unit, setUnit] = useState("");
  const [sigFigs, setSigFigs] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "marking" | "error" | "done">("loading");
  const [message, setMessage] = useState("");
  const [lastResponseId, setLastResponseId] = useState<string | null>(null);

  const loadNext = useCallback(async () => {
    setStatus("loading");
    setHint(null);
    setAnswer("");
    setUnit("");
    setSigFigs("");
    try {
      const next = await nextQuestion(sessionId);
      if (next.done) {
        setStatus("done");
        setCurrent(null);
        return;
      }
      setCurrent(next);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not load question.");
    }
  }, [sessionId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  async function onSubmit() {
    if (!current) return;
    setStatus("marking");
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
      const submitted = await submitAnswer(
        sessionId,
        { questionId: q.questionId, answer: payload, confidence: "MEDIUM" },
        crypto.randomUUID(),
      );
      setLastResponseId(submitted.responseId);
      for (let i = 0; i < 20; i++) {
        const res = await pollResult(submitted.responseId);
        if (res.status !== "MARKING" && res.status !== "PENDING") break;
        await new Promise((r) => setTimeout(r, 300));
      }
      window.location.href = `/practice/${sessionId}/result/${submitted.responseId}`;
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Submit failed.");
    }
  }

  const options = Array.isArray(current?.question.optionsJson)
    ? (current!.question.optionsJson as { key: string; text: string }[])
    : [];
  const isCalc = current?.question.questionType === "CALCULATION";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Practice</h1>
      {(status === "loading" || status === "marking") && (
        <div className="mt-8">
          <LoadingState label={status === "marking" ? "Marking your answer…" : "Loading question…"} />
        </div>
      )}
      {status === "error" && <div className="mt-8"><ErrorState body={message} /></div>}
      {current && status === "idle" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-ink/60">
            {current.question.questionType} · {current.question.marksAvailable} mark
            {current.question.marksAvailable === 1 ? "" : "s"}
            {current.question.commandWord ? ` · ${current.question.commandWord}` : ""}
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
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                {isCalc ? "Numeric value" : "Your answer"}
                <input
                  className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  inputMode={isCalc ? "decimal" : "text"}
                />
              </label>
              {isCalc && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold">
                    Unit
                    <input
                      className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. mol/dm³"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Significant figures
                    <input
                      className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
                      value={sigFigs}
                      onChange={(e) => setSigFigs(e.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
          {hint && <p className="rounded-md bg-mist/40 px-3 py-2 text-sm" role="status">{hint}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSubmit} disabled={!answer}>
              Submit answer
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  const h = await requestHint(sessionId, current.question.questionId);
                  setHint(`Hint (level ${h.level}): ${h.hintText}`);
                } catch (err) {
                  setMessage(err instanceof ApiError ? err.message : "Hint unavailable");
                  setStatus("error");
                }
              }}
            >
              Hint
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await endSession(sessionId);
                setStatus("done");
              }}
            >
              End session
            </Button>
          </div>
        </div>
      )}
      {status === "done" && (
        <div className="mt-8 space-y-3">
          <p className="text-success">Session complete.</p>
          {lastResponseId && (
            <Link className="underline" href={`/practice/${sessionId}/result/${lastResponseId}`}>
              Last result
            </Link>
          )}
          <Link className="block underline" href="/home">
            Back home
          </Link>
        </div>
      )}
            <EngagementOverlays sessionId={typeof sessionId === "string" ? sessionId : undefined} />
      </main>
  );
}
