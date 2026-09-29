"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** D-04 11+ entrance — no skip / no back */
export default function EntrancePage() {
  const params = useParams() as { runId: string };
  const search = useSearchParams();
  const [runId, setRunId] = useState(params.runId === "new" ? "" : params.runId);
  const [item, setItem] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNext = useCallback(async (id: string) => {
    const next = await api.entranceNext(id);
    if (next.complete) {
      setResult(await api.entranceResult(id));
      setItem(null);
    } else {
      setItem(next);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let id = params.runId === "new" ? "" : params.runId;
        if (!id) {
          const enrolmentId = search.get("enrolmentId") || sessionStorage.getItem("enrolmentId");
          if (!enrolmentId) throw new Error("enrolmentId required to start entrance test");
          const started = await api.startEntrance({ enrolmentId, examType: "GRAMMAR" });
          id = started.runId;
          if (!cancelled) setRunId(id);
        } else if (!cancelled) {
          setRunId(id);
        }
        await loadNext(id);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load entrance test");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per route param
  }, [params.runId]);

  async function submit() {
    if (!runId || !item) return;
    try {
      const r = await api.entranceAnswer(runId, {
        questionId: item.questionId,
        answerText: answer,
        itemIndex: item.itemIndex ?? item.answeredCount,
      });
      setAnswer("");
      if (r.complete) {
        setResult(await api.entranceResult(runId));
        setItem(null);
      } else {
        await loadNext(runId);
      }
    } catch (e: any) {
      setError(e?.message ?? "Answer failed");
    }
  }

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">11+ entrance test</h1>
        <p className="mt-2 text-sm" role="note">Locked-down: no skip, no back. Server picks the next item.</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {item && (
          <div className="mt-8 space-y-4 animate-rise">
            <p className="text-sm">Item {(item.answeredCount ?? 0) + 1} of {item.quotaItems}</p>
            <p className="text-lg">{item.questionText ?? JSON.stringify(item)}</p>
            <label className="block text-sm">
              Your answer
              <input className="mt-1 w-full rounded border px-3 py-2" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Entrance answer" />
            </label>
            <button type="button" className="rounded border px-4 py-2" onClick={submit} disabled={!answer.trim()}>Submit answer</button>
            <p className="text-xs opacity-60">Skip and back are disabled.</p>
          </div>
        )}
        {result && (
          <div className="mt-8"><EmptyState title="Entrance complete" body={`Answered ${result.answeredCount} · correct ${result.correctCount}`} /></div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Home</Link></p>
      </main>
    </div>
  );
}
