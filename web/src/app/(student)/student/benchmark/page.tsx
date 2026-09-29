"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** H-07 Cohort benchmark — honest empty unless opted in and n≥50 */
export default function BenchmarkPage() {
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") ?? "" : "";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError("Sign in as a student");
      return;
    }
    api.cohortBenchmark(studentId)
      .then(setData)
      .catch((e) => setError(e?.message ?? "Could not load benchmark"))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Cohort benchmark</h1>
        <p className="mt-2 text-sm">Anonymised percentile only when opted in and cohort size ≥ 50.</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && !data.available && (
          <div className="mt-8">
            <EmptyState title="Benchmark not available" body={data.message ?? data.emptyReason} />
            <p className="mt-2 text-sm">Sample size: {data.sampleSize} / min {data.minSampleSize}. Opted in: {String(data.optedIn)}</p>
          </div>
        )}
        {data?.available && (
          <div className="mt-8 animate-rise" aria-live="polite">
            <p>{data.message}</p>
            <pre className="mt-4 overflow-auto rounded border p-4 text-sm">{JSON.stringify(data.benchmark, null, 2)}</pre>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Home</Link></p>
      </main>
    </div>
  );
}
