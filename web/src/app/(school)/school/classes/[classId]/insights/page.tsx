"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { classMastery } from "@/lib/api/w2";

export default function InsightsPage() {
  const { classId } = useParams<{ classId: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { classMastery(classId).then(setData).catch(() => setError("Could not load insights")); }, [classId]);
  return (
    <div>
      <AppNav displayName="Teacher" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Class insights</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (data.heatmap?.length ?? 0) === 0 && <div className="mt-8"><EmptyState title="No mastery yet" body="Heatmap fills as pupils practise." /></div>}
        <ul className="mt-8 space-y-2">
          {data?.heatmap?.map((c: any) => (
            <li key={c.topicId} className="rounded border p-3 text-sm">Topic {c.topicId}: avg {c.avgMastery} ({c.pupils} pupils)</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
