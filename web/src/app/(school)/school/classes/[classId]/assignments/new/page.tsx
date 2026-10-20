"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, PaperPlaneTilt } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Field, Input, KeyValue, PageHeader } from "@/components/ui/primitives";
import { ForbiddenState, LoadingState } from "@/components/ui/states";
import { ResultNote, StatusBadge, actionError, toProblem, type Note } from "@/components/staff/ops";
import { TEACHER_FORBIDDEN, useSchoolId } from "@/components/school/school";
import { createAssignment, schoolClasses } from "@/lib/api/w2";
import { specTopics, type SpecTopic } from "@/lib/api/catalog";
import { cx } from "@/components/ui/cx";
import { publishAssignment } from "@/lib/api/school-ops";

type Errors = Partial<Record<"title" | "topics" | "count" | "due", string>>;

/** ASG-01 — New assignment for a class (teacher). */
export default function NewAssignmentPage() {
  return (
    <Suspense
      fallback={
        <AppPage width="content">
          <LoadingState />
        </AppPage>
      }
    >
      <NewAssignmentForm />
    </Suspense>
  );
}

function NewAssignmentForm() {
  const { classId } = useParams<{ classId: string }>();
  const search = useSearchParams();
  const [title, setTitle] = useState("Week 1 practice");
  const school = useSchoolId();
  const [allTopics, setAllTopics] = useState<SpecTopic[] | null>(null);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>(() =>
    (search?.get("topics") ?? "")
      .split(",")
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0),
  );

  // Topics come from the class's specification, so teachers tick names instead of typing ids.
  useEffect(() => {
    schoolClasses(school)
      .then(async (r) => {
        const cls = (r.items as Array<Record<string, unknown>>).find((c) => String(c.classId) === classId);
        const specId = cls?.specificationId;
        if (specId == null) throw new Error("This class has no specification yet.");
        const t = await specTopics(String(specId));
        setAllTopics(t.topics.filter((x) => (x.level ?? 1) === 1));
      })
      .catch((e: unknown) => setTopicsError(e instanceof Error ? e.message : "Could not load topics."));
  }, [school, classId]);

  const topicLabel = (id: number) => {
    const t = allTopics?.find((x) => x.topicId === id);
    return t ? `${t.number ? `${t.number} ` : ""}${t.name}` : `Topic ${id}`;
  };
  const [count, setCount] = useState("10");
  const [due, setDue] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ assignmentId: string; status: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState<Note>(null);

  function validate(): { body: Record<string, unknown> } | null {
    const next: Errors = {};
    const t = title.trim();
    if (!t) next.title = "Enter a title pupils will recognise.";
    else if (t.length > 120) next.title = "Keep the title under 120 characters.";
    const topicIds = picked.length > 0 ? picked : null;
    if (!topicIds) next.topics = "Pick at least one topic.";
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 50) next.count = "Choose between 1 and 50 questions.";
    if (due) {
      const d = new Date(`${due}T17:00:00Z`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(d.getTime())) next.due = "Enter a valid date.";
      else if (d.getTime() < today.getTime()) next.due = "The due date cannot be in the past.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !topicIds) return null;
    const body: Record<string, unknown> = { title: t, topicIds, questionCount: n };
    if (due) body.dueAt = `${due}T17:00:00Z`;
    return { body };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (!v) return;
    setSaving(true);
    try {
      const r = (await createAssignment(classId, v.body)) as { assignmentId?: string; status?: string } | null;
      setCreated({ assignmentId: String(r?.assignmentId ?? ""), status: String(r?.status ?? "DRAFT") });
    } catch (err) {
      const p = toProblem(err, "Could not create the assignment. Try again.");
      if (p.forbidden) setForbidden(true);
      else setError(p.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (!created) return;
    setPublishing(true);
    setNote(null);
    try {
      const r = await publishAssignment(created.assignmentId);
      setCreated({ assignmentId: created.assignmentId, status: r.status });
      setNote({ tone: "success", text: "Published. Pupils in this class can now see the assignment." });
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Could not publish the assignment. Try again.") });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Assignments"
        title="New assignment"
        description="Adaptive practice for every pupil in this class."
        actions={
          <ButtonLink href={`/school/classes/${classId}/insights`} variant="tertiary" icon={<ArrowLeft size={18} />}>
            Class insights
          </ButtonLink>
        }
      />

      {forbidden ? (
        <ForbiddenState body={TEACHER_FORBIDDEN} />
      ) : created ? (
        <Card>
          <CardHeader title="Assignment created" description={title.trim()} action={<StatusBadge status={created.status} />} />
          <CardBody className="space-y-4">
            <KeyValue
              items={[
                ["Questions", count],
                ["Topics", picked.map(topicLabel).join(", ")],
                ["Due", due ? new Date(`${due}T17:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "In 7 days (default)"],
              ]}
            />
            <ResultNote note={note} />
            <div className="flex flex-wrap gap-2">
              {created.status !== "PUBLISHED" && (
                <Button onClick={() => void onPublish()} loading={publishing} icon={<PaperPlaneTilt size={18} />}>
                  Publish to pupils
                </Button>
              )}
              <ButtonLink href={`/school/classes/${classId}/insights`} variant="secondary">
                Back to class
              </ButtonLink>
              <Button
                variant="tertiary"
                onClick={() => {
                  setCreated(null);
                  setNote(null);
                }}
              >
                Create another
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <form onSubmit={onSubmit} noValidate>
            <CardBody className="space-y-5">
              <Field label="Title" htmlFor="asg-title" error={errors.title}>
                <Input id="asg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </Field>
              <fieldset>
                <legend className="text-[14px] font-semibold text-neutral-700">Topics</legend>
                <p className="mt-0.5 text-caption text-neutral-600">Questions are drawn from the topics you tick.</p>
                {topicsError ? (
                  <Callout tone="danger" className="mt-2">{topicsError}</Callout>
                ) : !allTopics ? (
                  <p className="mt-2 text-caption text-neutral-600">Loading topics…</p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {allTopics.map((t) => {
                      const on = picked.includes(t.topicId);
                      return (
                        <label
                          key={t.topicId}
                          className={cx(
                            "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-[14px] transition-colors duration-fast",
                            on ? "border-brand-navy bg-brand-navySoft text-brand-navy" : "border-neutral-200 hover:border-neutral-400",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sl-check mt-0.5 h-4 w-4 shrink-0"
                            checked={on}
                            onChange={() =>
                              setPicked((p) => (on ? p.filter((x) => x !== t.topicId) : [...p, t.topicId]))
                            }
                          />
                          <span>
                            {t.number && <span className="tabular mr-1 font-semibold">{t.number}</span>}
                            {t.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {errors.topics && <p className="mt-1.5 text-caption text-answer-incorrect" role="alert">{errors.topics}</p>}
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Number of questions" htmlFor="asg-count" error={errors.count}>
                  <Input
                    id="asg-count"
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field label="Due date" htmlFor="asg-due" hint="Optional. Defaults to 7 days, 5pm." error={errors.due}>
                  <Input id="asg-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </Field>
              </div>
              {error && (
                <Callout tone="danger" title="Assignment not created">
                  {error}
                </Callout>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
                <Button type="submit" loading={saving}>
                  Create assignment
                </Button>
                <p className="text-caption text-neutral-600">Saved as a draft. You can publish it on the next step.</p>
              </div>
            </CardBody>
          </form>
        </Card>
      )}
    </AppPage>
  );
}
