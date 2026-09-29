"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w3";
import { getSampleQuestion, answerSampleQuestion, listOutcomes } from "@/lib/api/marketing";
import { startPractice } from "@/lib/api/practice";

/** B-07 — Personalised weekly plan */
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

        if (!studentId) throw new Error("Sign in as a student first");
        let plan = await api.getWeeklyPlan(studentId, token);
        if (!plan?.items?.length && !plan?.planId) plan = await api.generateWeeklyPlan(studentId, {}, token);
        const result = plan;

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
        <h1 className="font-display text-4xl">Personalised weekly plan</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (
          <div className="mt-8 space-y-4 animate-rise">
            <p className="text-sm text-ink/70">Wired to live API.</p>
            <pre className="overflow-auto rounded border border-mist bg-white/70 p-4 text-sm" aria-live="polite">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Back</Link></p>
      </main>
    </div>
  );
}
