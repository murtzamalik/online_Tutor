"use client";

import { useEffect, useState } from "react";
import { evalSummary, listGold, runEval } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** Q-01 — AI eval harness */
export default function AiEvalPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [gold, setGold] = useState<{ total: number; targetSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      setSummary(await evalSummary());
      const g = await listGold();
      setGold({ total: g.total, targetSize: g.targetSize });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AIE/OWN role required");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">AI evaluation</h1>
      <p className="mt-2 text-ink/70">Gold-set size and latest eval run (synthetic until P-2).</p>
      {!summary && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {summary && (
        <pre className="mt-8 overflow-auto rounded-md border border-mist bg-white/70 p-4 text-sm">
          {JSON.stringify({ summary, gold }, null, 2)}
        </pre>
      )}
      <Button
        className="mt-6"
        onClick={async () => {
          try {
            const r = await runEval();
            setNote(`Eval ${String(r.evalId)} exact=${String(r.exactTotalAgreement)}`);
            await reload();
          } catch (err) {
            setNote(err instanceof ApiError ? err.message : "Eval failed");
          }
        }}
      >
        Run eval
      </Button>
      {note && (
        <p className="mt-3 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
