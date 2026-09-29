"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { disputeAnswer, getMarking, pollResult } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** F-01 — Marking result */
export default function PracticeResultPage() {
  const { sessionId, responseId } = useParams<{ sessionId: string; responseId: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [marking, setMarking] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeMsg, setDisputeMsg] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await pollResult(responseId);
        setData(res as unknown as Record<string, unknown>);
        const m = await getMarking(responseId);
        setMarking(m);
        if (typeof m.questionId === "string" || typeof m.questionId === "number") {
          setQuestionId(m.questionId);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load result.");
      }
    })();
  }, [responseId]);

  async function onDispute() {
    try {
      const d = await disputeAnswer(responseId, "OTHER", "I think the mark scheme allows my answer");
      setDisputeMsg(`Dispute lodged (${d.disputeId}).`);
    } catch (err) {
      setDisputeMsg(err instanceof ApiError ? err.message : "Dispute failed.");
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <ErrorState body={error} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <LoadingState label="Loading marks…" />
      </main>
    );
  }

  const marks = (data.marks ?? {}) as { awarded?: number; available?: number };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Your marks</h1>
      <p className="mt-4 text-2xl font-semibold">
        {marks.awarded ?? "—"} / {marks.available ?? "—"}
      </p>
      <p className="mt-2 text-ink/70">Status: {String(data.status)}</p>
      {Array.isArray(data.points) && (
        <ul className="mt-6 space-y-2">
          {(data.points as Record<string, unknown>[]).map((p, i) => (
            <li key={i} className="rounded-md border border-mist bg-white/70 px-3 py-2 text-sm">
              {String(p.id ?? `P${i + 1}`)}: {String(p.awarded ?? p.point ?? JSON.stringify(p))}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-md bg-accent px-4 py-2 font-semibold text-white" href={`/practice/${sessionId}`}>
          Next question
        </Link>
        {questionId != null && (
          <Link
            className="rounded-md border border-mist px-4 py-2 font-semibold"
            href={`/practice/${sessionId}/scheme/${questionId}?responseId=${responseId}`}
          >
            View mark scheme
          </Link>
        )}
        <Button variant="ghost" onClick={onDispute}>
          Dispute (F-04)
        </Button>
      </div>
      {disputeMsg && <p className="mt-4 text-sm" role="status">{disputeMsg}</p>}
      {marking && (
        <pre className="mt-8 overflow-auto rounded-md bg-mist/30 p-3 text-xs text-ink/70">
          {JSON.stringify(marking.feedback ?? marking.feedbackJson ?? {}, null, 2)}
        </pre>
      )}
    </main>
  );
}
