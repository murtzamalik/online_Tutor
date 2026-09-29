"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** H-06 Knowledge / skill map */
export default function SkillMapPage() {
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
    api.skillMap(studentId)
      .then(setData)
      .catch((e) => setError(e?.message ?? "Could not load map"))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Knowledge map</h1>
        <p className="mt-2 text-sm">Skill tree from mastery state — keyboard accessible list (no gamification badges).</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (data.nodes?.length ?? 0) === 0 && (
          <div className="mt-8"><EmptyState title="Map empty" body="Practise a few topics to grow your map." /></div>
        )}
        <ul className="mt-8 space-y-2" role="list">
          {(data?.nodes ?? []).map((n: any) => (
            <li key={n.topicId}>
              <a className="block rounded border px-3 py-2 focus:outline focus:outline-2" href={`#topic-${n.topicId}`} id={`topic-${n.topicId}`}>
                <span className="font-medium">{n.label}</span>
                <span className="ml-2 text-sm opacity-70">level {n.masteryLevel} · p={Number(n.masteryProbability).toFixed(2)}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Home</Link></p>
      </main>
    </div>
  );
}
