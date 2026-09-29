"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { getMarkScheme } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** F-02 — Mark scheme reveal (after attempt) */
export default function SchemePage() {
  const { sessionId, questionId } = useParams<{ sessionId: string; questionId: string }>();
  const responseId = useSearchParams().get("responseId");
  const [scheme, setScheme] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarkScheme(questionId)
      .then(setScheme)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Scheme unavailable."));
  }, [questionId]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Mark scheme</h1>
      <p className="mt-2 text-ink/70">Shown only after you have attempted this question.</p>
      {!scheme && !error && <div className="mt-8"><LoadingState /></div>}
      {error && <div className="mt-8"><ErrorState body={error} /></div>}
      {scheme && (
        <div className="mt-8 space-y-4">
          <p className="text-sm">
            Type: {String(scheme.schemeType ?? "—")} · Total: {String(scheme.totalMarks ?? "—")}
          </p>
          {scheme.modelAnswer != null && (
            <div>
              <h2 className="font-semibold">Model answer</h2>
              <p className="mt-1 text-ink/80">{String(scheme.modelAnswer)}</p>
            </div>
          )}
          <pre className="overflow-auto rounded-md bg-mist/30 p-3 text-xs">
            {JSON.stringify(scheme.markingPointsJson ?? scheme.markingPoints ?? scheme, null, 2)}
          </pre>
        </div>
      )}
      <div className="mt-8 flex gap-4 text-sm">
        <Link className="underline" href={`/practice/${sessionId}`}>
          Back to practice
        </Link>
        {responseId && (
          <Link className="underline" href={`/practice/${sessionId}/result/${responseId}`}>
            Back to result
          </Link>
        )}
      </div>
    </main>
  );
}
