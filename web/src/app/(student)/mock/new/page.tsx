"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w3";
import { getSampleQuestion, answerSampleQuestion, listOutcomes } from "@/lib/api/marketing";
import { startPractice } from "@/lib/api/practice";

/** D-02 — Mock paper setup */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;
  const childId = typeof window !== "undefined" ? (sessionStorage.getItem("childId") || params.id || studentId) : params.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {

        const result = { hint: "Create a timed mock from your enrolment", enrolmentId: sessionStorage.getItem("enrolmentId") };

        if (!cancelled) setData(result);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load");
      }
    })();
    return () => { cancelled = true; };
  }, [token, studentId, childId, params.mockId, params.sessionId, params.responseId, params.questionId, params.tutorSessionId, params.deckId, params.topicId, params.reportId, params.id]);

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Mock paper setup</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (
          <div className="mt-8 space-y-4 animate-rise">
            <button type="button" className="rounded border px-3 py-2" onClick={async () => {
              const enrolmentId = sessionStorage.getItem("enrolmentId");
              if (!enrolmentId) { setError("Set enrolmentId in session"); return; }
              const r = await api.createMock({ enrolmentId, durationMinutes: 45 }, token);
              setData(r);
              if (r.mockId) location.href = `/mock/${r.mockId}/sit`;
            }}>Assemble mock</button>
            <pre className="overflow-auto rounded border border-mist bg-white/70 p-4 text-sm" aria-live="polite">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Back</Link></p>
      </main>
    </div>
  );
}
