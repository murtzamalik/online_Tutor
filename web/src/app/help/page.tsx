"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w3";
import { getSampleQuestion, answerSampleQuestion, listOutcomes } from "@/lib/api/marketing";
import { startPractice } from "@/lib/api/practice";

/** P-01 — Help centre */
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

        const result = await api.helpSearch("");

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
        <h1 className="font-display text-4xl">Help centre</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (
          <div className="mt-8 space-y-4 animate-rise">
            <form onSubmit={async (e) => { e.preventDefault(); const q = new FormData(e.currentTarget as HTMLFormElement).get("q"); setData(await api.helpSearch(String(q||""))); }}>
              <input name="q" className="border px-2" placeholder="Search help" aria-label="Search help" />
              <button className="ml-2 rounded border px-2" type="submit">Search</button>
            </form>
            {(data.items ?? []).map((a: any) => (
              <button key={a.slug} type="button" className="block underline" onClick={async () => setData(await api.helpArticle(a.slug))}>{a.title}</button>
            ))}
            <pre className="overflow-auto rounded border border-mist bg-white/70 p-4 text-sm" aria-live="polite">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Back</Link></p>
      </main>
    </div>
  );
}
