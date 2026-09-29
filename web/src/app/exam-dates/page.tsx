"use client";

import { useEffect, useState } from "react";
import { listExamDates } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** A-08 — Exam date calendar */
export default function ExamDatesPage() {
  const [items, setItems] = useState<
    { examName: string; examOn: string; region: string; notes?: string | null }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState("England");

  useEffect(() => {
    listExamDates(region)
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load exam dates"));
  }, [region]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Exam dates</h1>
      <p className="mt-2 text-ink/70">Illustrative calendar for revision planning (confirm against board timetables).</p>
      <label className="mt-6 block text-sm font-medium" htmlFor="region">
        Region
      </label>
      <select
        id="region"
        className="mt-1 rounded-md border border-mist px-3 py-2"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
      >
        <option>England</option>
        <option>Wales</option>
        <option>Scotland</option>
        <option>NI</option>
        <option>International</option>
      </select>
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
          <EmptyState title="No dates" body="No exam dates for this region yet." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-3">
          {items.map((d, i) => (
            <li key={`${d.examName}-${i}`} className="rounded-md border border-mist bg-white/70 px-4 py-3">
              <p className="font-semibold">{d.examName}</p>
              <p className="text-sm text-ink/70">
                {d.examOn} · {d.region}
              </p>
              {d.notes && <p className="mt-1 text-sm text-ink/60">{d.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
