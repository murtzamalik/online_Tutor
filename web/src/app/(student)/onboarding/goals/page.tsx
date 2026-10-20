"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Exam, Target, TrendUp } from "@phosphor-icons/react";
import { listExamDates } from "@/lib/api/marketing";
import { listEnrolments, listStudents } from "@/lib/api/students";
import { patchEnrolment, putDailyGoal } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Callout, Card, CardBody, Field, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { SelectCard, StepHeader } from "@/components/student/StudentUI";
import { cx } from "@/components/ui/cx";
import { formatDate } from "@/components/student/studentData";

const GOAL_TYPES = [
  { value: "EXAM_PREP", title: "Exam prep", description: "Get ready for an exam date.", Icon: Exam },
  { value: "GENERAL_STUDY", title: "General study", description: "Keep up with lessons week by week.", Icon: BookOpen },
  { value: "TARGET_SCORE", title: "Target score", description: "Work towards a specific grade.", Icon: Target },
  // Stored value stays WEAK_AREA; copy follows the design rule of never calling a topic "weak".
  { value: "WEAK_AREA", title: "Tricky topics", description: "Focus on the topics you find hardest.", Icon: TrendUp },
] as const;

const DAILY_PRESETS = [5, 10, 15, 20];

/** B-05 — Study goal setter */
export default function GoalsPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState("EXAM_PREP");
  const [targetQuestions, setTargetQuestions] = useState(10);
  const [examDate, setExamDate] = useState("");
  const [dates, setDates] = useState<{ examName: string; examOn: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const kids = await listStudents();
        // The child just enrolled (?studentId= from the subjects step), else the last one picked, else the first.
        const wanted = new URLSearchParams(window.location.search).get("studentId") ?? sessionStorage.getItem("studentId");
        const sid = kids.items.find((k) => k.studentId === wanted)?.studentId ?? kids.items[0]?.studentId;
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
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        setError(err instanceof ApiError ? err.message : "Could not load goals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validTarget = Number.isInteger(targetQuestions) && targetQuestions >= 1 && targetQuestions <= 50;

  return (
    <AppPage width="content">
      <StepHeader step={2} title="Set your study goals" description="A small daily target is easier to keep than a big one." />

      {loading ? (
        <LoadingState lines={5} />
      ) : forbidden ? (
        <ForbiddenState body="Ask a parent to set study goals for this profile." />
      ) : error ? (
        <ErrorState
          body={error}
          action={error === "Add a child first" ? <ButtonLink href="/parent/children/new">Add a child</ButtonLink> : undefined}
        />
      ) : !enrolmentId ? (
        <EmptyState
          title="Choose a subject first"
          body="Goals are set per subject, so enrol on one first."
          action={<ButtonLink href={studentId ? `/onboarding/subjects?studentId=${studentId}` : "/onboarding/subjects"}>Choose subjects</ButtonLink>}
        />
      ) : (
        studentId && (
          <form
            className="space-y-8"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!validTarget) return;
              setSaving(true);
              setNote(null);
              try {
                await putDailyGoal(studentId, targetQuestions, true);
                await patchEnrolment(enrolmentId, {
                  goalType,
                  examDate: examDate || undefined,
                });
                setNote({ ok: true, text: "Goals saved" });
              } catch (err) {
                setNote({ ok: false, text: err instanceof ApiError ? err.message : "Save failed" });
              } finally {
                setSaving(false);
              }
            }}
          >
            <fieldset>
              <legend className="mb-3 text-h2">What are you working towards?</legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Goal type">
                {GOAL_TYPES.map((g) => (
                  <SelectCard
                    key={g.value}
                    selected={goalType === g.value}
                    onSelect={() => setGoalType(g.value)}
                    icon={<g.Icon size={20} />}
                    title={g.title}
                    description={g.description}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-h2">Questions per day</legend>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Daily question target">
                {DAILY_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={targetQuestions === n}
                    onClick={() => setTargetQuestions(n)}
                    className={cx(
                      "tabular h-12 w-16 rounded-md border-[1.5px] text-[17px] font-semibold transition-colors duration-fast",
                      targetQuestions === n ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <div className="ml-1 w-28">
                  <label htmlFor="daily" className="sr-only">
                    Custom daily question target
                  </label>
                  <Input
                    id="daily"
                    type="number"
                    min={1}
                    max={50}
                    value={targetQuestions}
                    onChange={(e) => setTargetQuestions(Number(e.target.value))}
                    aria-invalid={!validTarget}
                    className="tabular"
                  />
                </div>
              </div>
              <p className={cx("mt-2 text-caption", validTarget ? "text-neutral-600" : "text-answer-incorrect")} role={validTarget ? undefined : "alert"}>
                {validTarget ? `About ${Math.max(1, Math.round(targetQuestions * 2))} minutes a day.` : "Choose a whole number from 1 to 50."}
              </p>
            </fieldset>

            <Card>
              <CardBody>
                <Field
                  label="Exam date"
                  htmlFor="exam"
                  hint={dates.length > 0 ? `Next in the calendar: ${dates[0].examName}, ${formatDate(dates[0].examOn)}` : "Optional — helps us pace your plan."}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Input id="exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="max-w-[220px]" />
                    {dates.length > 0 && examDate !== dates[0].examOn.slice(0, 10) && (
                      <Button type="button" variant="tertiary" size="sm" onClick={() => setExamDate(dates[0].examOn.slice(0, 10))}>
                        Use this date
                      </Button>
                    )}
                  </div>
                </Field>
              </CardBody>
            </Card>

            {note && (
              <Callout tone={note.ok ? "success" : "danger"} title={note.ok ? "Goals saved" : "Not saved"}>
                {note.ok ? "Next, choose the settings that make studying comfortable." : note.text}
              </Callout>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {note?.ok && (
                <ButtonLink href="/onboarding/accessibility" variant="secondary" icon={<ArrowRight size={18} />}>
                  Next: accessibility
                </ButtonLink>
              )}
              <Button type="submit" size="lg" loading={saving} disabled={!validTarget}>
                Save goals
              </Button>
            </div>
          </form>
        )
      )}
    </AppPage>
  );
}
