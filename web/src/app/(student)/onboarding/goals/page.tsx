"use client";

import { useEffect, useState } from "react";
import { listExamDates } from "@/lib/api/marketing";
import { listEnrolments, listStudents } from "@/lib/api/students";
import { patchEnrolment, putDailyGoal } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** B-05 — Study goal setter */
export default function GoalsPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState("EXAM_PREP");
  const [targetQuestions, setTargetQuestions] = useState(10);
  const [examDate, setExamDate] = useState("");
  const [dates, setDates] = useState<{ examName: string; examOn: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const kids = await listStudents();
        const sid = kids.items[0]?.studentId;
        if (!sid) {
          setError("Add a child first");
          setLoading(false);
          return;
        }
        setStudentId(sid);
        const enrols = await listEnrolments(sid);
        if (enrols.items[0]) {
          setEnrolmentId(enrols.items[0].enrolmentId);
          if (enrols.items[0].goalType) setGoalType(enrols.items[0].goalType);
          if (enrols.items[0].examDate) setExamDate(String(enrols.items[0].examDate).slice(0, 10));
        }
        const ed = await listExamDates("England");
        setDates(ed.items.map((d) => ({ examName: d.examName, examOn: d.examOn })));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load goals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-4xl">Study goals</h1>
      <p className="mt-2 text-ink/70">Set daily practice target and enrolment goal type.</p>
      {error && (
        <div className="mt-6">
          <ErrorState body={error} />
        </div>
      )}
      {!error && !enrolmentId && (
        <div className="mt-6">
          <EmptyState title="No enrolment" body="Enrol in a subject first." />
        </div>
      )}
      {studentId && enrolmentId && (
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await putDailyGoal(studentId, targetQuestions, true);
              await patchEnrolment(enrolmentId, {
                goalType,
                examDate: examDate || undefined,
              });
              setNote("Goals saved");
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Save failed");
            }
          }}
        >
          <label className="block text-sm font-medium" htmlFor="goal-type">
            Goal type
          </label>
          <select
            id="goal-type"
            className="w-full rounded-md border border-mist px-3 py-2"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value)}
          >
            <option value="EXAM_PREP">Exam prep</option>
            <option value="GENERAL_STUDY">General study</option>
            <option value="TARGET_SCORE">Target score</option>
            <option value="WEAK_AREA">Weak area</option>
          </select>
          <label className="block text-sm font-medium" htmlFor="daily">
            Daily question target
          </label>
          <input
            id="daily"
            type="number"
            min={1}
            max={50}
            className="w-full rounded-md border border-mist px-3 py-2"
            value={targetQuestions}
            onChange={(e) => setTargetQuestions(Number(e.target.value))}
          />
          <label className="block text-sm font-medium" htmlFor="exam">
            Exam date
          </label>
          <input
            id="exam"
            type="date"
            className="w-full rounded-md border border-mist px-3 py-2"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
          {dates.length > 0 && (
            <p className="text-xs text-ink/60">
              Catalogue hint: {dates[0].examName} on {dates[0].examOn}
            </p>
          )}
          <Button type="submit">Save goals</Button>
        </form>
      )}
      {note && (
        <p className="mt-4 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
