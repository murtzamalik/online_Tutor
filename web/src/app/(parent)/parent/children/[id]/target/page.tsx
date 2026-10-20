"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { listEnrolments } from "@/lib/api/students";
import { patchEnrolment, predictedGrades } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** B-08 — Parent sets target grade */
export default function TargetGradePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [enrolments, setEnrolments] = useState<
    { enrolmentId: string; title?: string | null; specCode?: string; targetGrade?: string | null }[] | null
  >(null);
  const [grades, setGrades] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      const e = await listEnrolments(studentId);
      setEnrolments(e.items);
      const g = await predictedGrades(studentId);
      setGrades(g);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load enrolments");
    }
  }

  useEffect(() => {
    void reload();
  }, [studentId]);

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-4xl">Target grades</h1>
      <p className="mt-2 text-ink/70">Set a stretch grade per enrolment.</p>
      {!enrolments && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {enrolments && enrolments.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No enrolments" body="Enrol this child in a subject first." />
        </div>
      )}
      {enrolments && enrolments.length > 0 && (
        <ul className="mt-8 space-y-4">
          {enrolments.map((en) => (
            <li key={en.enrolmentId} className="rounded-md border border-mist bg-white/70 p-4">
              <p className="font-semibold">
                {en.specCode || en.title || en.enrolmentId.slice(0, 8)}
              </p>
              <label className="mt-3 block text-sm" htmlFor={`tg-${en.enrolmentId}`}>
                Target grade
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id={`tg-${en.enrolmentId}`}
                  defaultValue={en.targetGrade ?? ""}
                  className="rounded-md border border-mist px-3 py-2"
                  placeholder="6"
                />
                <Button
                  onClick={async () => {
                    const el = document.getElementById(`tg-${en.enrolmentId}`) as HTMLInputElement;
                    try {
                      await patchEnrolment(en.enrolmentId, { targetGrade: el.value });
                      setNote(`Saved target ${el.value}`);
                      await reload();
                    } catch (err) {
                      setNote(err instanceof ApiError ? err.message : "Save failed");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {grades != null && (
        <div className="mt-8 rounded-md border border-mist bg-white/70 p-4 animate-rise">
          <h2 className="font-display text-xl">Predicted grades</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/80">
            {Array.isArray(grades) && grades.length > 0 ? (
              grades.map((g: any, i: number) => (
                <li key={i}>
                  {String(g.subject ?? g.name ?? "Subject")}: {String(g.grade ?? g.target ?? "—")}
                </li>
              ))
            ) : (
              <li>No predicted grades yet.</li>
            )}
          </ul>
        </div>
      )}
      {note && (
        <p className="mt-4 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
