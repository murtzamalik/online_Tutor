"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w3";
import { getSampleQuestion, answerSampleQuestion, listOutcomes } from "@/lib/api/marketing";
import { startPractice } from "@/lib/api/practice";

/** B-03 — Student sign-up (13+) */
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

        const result = { form: "ready", note: "Under-13 must use parent signup" };

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
        <h1 className="font-display text-4xl">Student sign-up (13+)</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (
          <div className="mt-8 space-y-4 animate-rise">
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              try {
                setData(await api.registerStudent({
                  email: String(fd.get("email")),
                  password: String(fd.get("password")),
                  displayName: String(fd.get("displayName")),
                  ageYears: Number(fd.get("ageYears")),
                  parentAware: fd.get("parentAware") === "on",
                  acceptTerms: fd.get("acceptTerms") === "on",
                }));
              } catch (err: any) { setError(err.message); }
            }}>
              <label className="block">Email <input name="email" type="email" required className="ml-2 border px-2" /></label>
              <label className="block">Password <input name="password" type="password" minLength={10} required className="ml-2 border px-2" /></label>
              <label className="block">First name <input name="displayName" required className="ml-2 border px-2" /></label>
              <label className="block">Age <input name="ageYears" type="number" min={13} required className="ml-2 border px-2" /></label>
              <label className="block"><input name="parentAware" type="checkbox" /> Parent aware (13–15)</label>
              <label className="block"><input name="acceptTerms" type="checkbox" required /> Accept terms</label>
              <button className="rounded bg-ink px-3 py-2 text-white" type="submit">Create account</button>
            </form>
            <pre className="overflow-auto rounded border border-mist bg-white/70 p-4 text-sm" aria-live="polite">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Back</Link></p>
      </main>
    </div>
  );
}
