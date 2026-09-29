"use client";

import { useEffect, useState } from "react";
import { boundaryAttestation, gatewayLog } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** Q-02 — Boundary / gateway log */
export default function BoundaryPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[] | null>(null);
  const [attestations, setAttestations] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const g = await gatewayLog();
        setLogs(g.items);
        try {
          const b = await boundaryAttestation();
          setAttestations(b.items);
        } catch {
          setAttestations([]);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "CMP/AIE role required");
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">AI boundary</h1>
      <p className="mt-2 text-ink/70">Gateway logs and daily boundary attestations (no learner PII).</p>
      {!logs && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {logs && logs.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No gateway logs" body="Logs appear after AI calls." />
        </div>
      )}
      {logs && logs.length > 0 && (
        <ul className="mt-8 space-y-2">
          {logs.map((l) => (
            <li key={String(l.logId)} className="rounded-md border border-mist px-3 py-2 text-sm">
              {String(l.taskKey)} · {String(l.status)} · boundaryOk={String(l.boundaryOk)} ·{" "}
              {String(l.latencyMs)}ms
            </li>
          ))}
        </ul>
      )}
      {attestations && attestations.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Attestations</h2>
          <ul className="mt-3 space-y-2">
            {attestations.map((a) => (
              <li key={String(a.attestationId)} className="text-sm">
                {String(a.day)} · passed={String(a.passed)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
