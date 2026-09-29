"use client";

import { useEffect, useState } from "react";
import { taggingProgress } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** M-04 — Spec-point tagging progress */
export default function TaggingProgressPage() {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    taggingProgress()
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "CNT role required"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Tagging progress</h1>
      <p className="mt-2 text-ink/70">DONE / IN_PROGRESS / TODO counts per specification.</p>
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
          <EmptyState title="No specs" body="Catalogue empty." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-3">
          {items.map((row) => (
            <li
              key={String(row.specificationId)}
              className="rounded-md border border-mist bg-white/70 px-4 py-3"
            >
              <p className="font-semibold">
                {String(row.specCode)} — {String(row.title)}
              </p>
              <p className="text-sm text-ink/70">
                Done {String(row.doneCount)} · In progress {String(row.inProgressCount)} · Todo{" "}
                {String(row.todoCount)} · Total {String(row.totalTopics)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
