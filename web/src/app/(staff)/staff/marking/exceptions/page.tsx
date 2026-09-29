"use client";

import { useEffect, useState } from "react";
import { claimException, listExceptions, resolveException } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** F-10 — Staff marking exceptions queue */
export default function StaffExceptionsPage() {
  const [items, setItems] = useState<
    { exceptionId: string; responseId: string; trigger: string; status: string; slaDueAt?: string | null }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await listExceptions();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load exceptions (OPS role required).");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Marking exceptions</h1>
      <p className="mt-2 text-ink/70">OPS queue for low confidence, pass disagreement, and disputes.</p>
      {!items && !error && <div className="mt-8"><LoadingState /></div>}
      {error && <div className="mt-8"><ErrorState body={error} /></div>}
      {items && items.length === 0 && (
        <div className="mt-8"><EmptyState title="Queue empty" body="No open marking exceptions." /></div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-3">
          {items.map((ex) => (
            <li key={ex.exceptionId} className="rounded-md border border-mist bg-white/70 px-4 py-3">
              <p className="font-semibold">
                {ex.trigger} · {ex.status}
              </p>
              <p className="text-sm text-ink/70">
                {ex.exceptionId.slice(0, 8)}… · response {ex.responseId.slice(0, 8)}…
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await claimException(ex.exceptionId);
                      setNote(`Claimed ${ex.exceptionId}`);
                      await reload();
                    } catch (err) {
                      setNote(err instanceof ApiError ? err.message : "Claim failed");
                    }
                  }}
                >
                  Claim
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await resolveException(ex.exceptionId, {
                        finalMarks: 1,
                        resolution: "UPHELD",
                        resolutionNote: "W1 staff resolve",
                        addToGold: true,
                      });
                      setNote(`Resolved ${ex.exceptionId}`);
                      await reload();
                    } catch (err) {
                      setNote(err instanceof ApiError ? err.message : "Resolve failed");
                    }
                  }}
                >
                  Resolve uphold
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-4 text-sm" role="status">{note}</p>}
    </main>
  );
}
