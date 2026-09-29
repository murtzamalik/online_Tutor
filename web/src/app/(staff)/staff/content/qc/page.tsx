"use client";

import { useEffect, useState } from "react";
import {
  approveQc,
  createGenerationRun,
  generationCoverage,
  listQcExceptions,
  rejectQc,
} from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** E-01 — AI Question QC exceptions */
export default function QcPage() {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [coverage, setCoverage] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await listQcExceptions();
      setItems(res.items);
      setCoverage(await generationCoverage());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CNT role required");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">QC exceptions</h1>
      <p className="mt-2 text-ink/70">Approve or reject PENDING_QC / QC_FAILED questions.</p>
      <div className="mt-4 flex gap-2">
        <Button
          onClick={async () => {
            try {
              const run = await createGenerationRun();
              setNote(`Generation run ${String(run.runId)}`);
              await reload();
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Run failed");
            }
          }}
        >
          Trigger GEN run
        </Button>
      </div>
      {!items && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {items && items.length === 0 && (
        <div className="mt-8">
          <EmptyState title="Queue empty" body="No QC exceptions." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-3">
          {items.map((q) => {
            const id = String(q.questionId);
            return (
              <li key={id} className="rounded-md border border-mist bg-white/70 px-4 py-3">
                <p className="font-semibold">
                  #{id} · {String(q.reviewStatus)} · {String(q.questionType)}
                </p>
                <p className="text-sm text-ink/80">{String(q.questionText)}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await approveQc(id);
                        setNote(`Approved ${id}`);
                        await reload();
                      } catch (err) {
                        setNote(err instanceof ApiError ? err.message : "Approve failed");
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await rejectQc(id);
                        setNote(`Rejected ${id}`);
                        await reload();
                      } catch (err) {
                        setNote(err instanceof ApiError ? err.message : "Reject failed");
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {coverage != null && (
        <pre className="mt-8 overflow-auto rounded-md bg-mist/30 p-3 text-xs">
          {JSON.stringify(coverage, null, 2)}
        </pre>
      )}
      {note && (
        <p className="mt-4 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
