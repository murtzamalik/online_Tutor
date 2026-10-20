"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Field, Input, MasteryBadge, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { FailureView, SelectCard } from "@/components/student/StudentUI";
import {
  asArray,
  errorText,
  isRecord,
  num,
  parseTopics,
  plural,
  str,
  toFailure,
  type LoadFailure,
  type StudentTopic,
} from "@/components/student/studentData";
import * as api from "@/lib/api/w3";
import { startPractice } from "@/lib/api/practice";

type QuizSet = { setId: string; title: string; topicIds: number[]; questionCount: number };

function parseSets(res: unknown): QuizSet[] {
  const items = isRecord(res) ? asArray(res.items) : [];
  return items.filter(isRecord).map((s) => ({
    setId: str(s.setId),
    title: str(s.title, "Custom quiz"),
    topicIds: asArray(s.topicIds).map((t) => num(t)).filter((t): t is number => t != null),
    questionCount: num(s.questionCount) ?? 10,
  }));
}

const COUNTS = [5, 10, 15, 20];

/** D-07 — Custom quiz builder */
export default function Page() {
  const router = useRouter();
  const [topics, setTopics] = useState<StudentTopic[] | null>(null);
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [title, setTitle] = useState("My mix");
  const [count, setCount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;

  const load = useCallback(async () => {
    setFailure(null);
    try {
      if (!studentId) throw new Error("Sign in");
      const t = await api.studentTopics(studentId, token);
      const s = await api.quizSets(studentId, token);
      setTopics(parseTopics(t));
      setSets(parseSets(s));
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, [studentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const titleError = touched && !title.trim() ? "Give your quiz a name." : null;
  const topicError = touched && picked.length === 0 ? "Pick at least one topic." : null;

  function toggle(id: number) {
    setNote(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function save() {
    setTouched(true);
    if (!studentId || !title.trim() || picked.length === 0) return;
    setSaving(true);
    setNote(null);
    try {
      const saved: unknown = await api.saveQuizSet(studentId, { title: title.trim(), topicIds: picked, questionCount: count }, token);
      const setId = isRecord(saved) ? str(saved.setId) : "";
      setSets((prev) => [{ setId, title: title.trim(), topicIds: picked, questionCount: count }, ...prev]);
      setNote({ ok: true, text: `“${title.trim()}” saved. Start it any time below.` });
      setTouched(false);
    } catch (e) {
      setNote({ ok: false, text: errorText(e, "We couldn't save your quiz.") });
    } finally {
      setSaving(false);
    }
  }

  async function startSet(s: QuizSet) {
    const enrolmentId = sessionStorage.getItem("enrolmentId");
    setStartError(null);
    if (!enrolmentId) {
      setStartError("No active enrolment — open Home first.");
      return;
    }
    setStartingId(s.setId);
    try {
      const session = await startPractice({
        enrolmentId,
        mode: "MIXED",
        topicIds: s.topicIds.length ? s.topicIds : undefined,
        plannedCount: s.questionCount,
      });
      router.push(`/practice/${session.sessionId}`);
    } catch (e) {
      setStartError(errorText(e, "Could not start this quiz."));
      setStartingId(null);
    }
  }

  const topicName = (id: number) => topics?.find((t) => t.topicId === id)?.topicName ?? `Topic ${id}`;

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Practice" title="Build a custom quiz" description="Choose topics and how many questions. Save it to reuse later." />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : topics === null ? (
        <LoadingState label="Loading your topics…" lines={5} />
      ) : topics.length === 0 ? (
        <EmptyState
          title="No topics yet"
          body="Topics appear once you’re enrolled on a subject."
          action={<ButtonLink href="/onboarding/subjects">Choose subjects</ButtonLink>}
        />
      ) : (
        <div className="space-y-8">
          <fieldset>
            <legend className="mb-1 text-h2">Topics</legend>
            <p className="mb-3 text-[14px] text-neutral-600">
              {picked.length === 0 ? "Tap to choose one or more." : `${plural(picked.length, "topic")} selected`}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Topics">
              {topics.map((t) => (
                <SelectCard
                  key={t.topicId}
                  role="checkbox"
                  selected={picked.includes(t.topicId)}
                  onSelect={() => toggle(t.topicId)}
                  title={t.topicName}
                  description={<MasteryBadge value={t.mastery} />}
                />
              ))}
            </div>
            {topicError && (
              <p className="mt-2 text-caption text-answer-incorrect" role="alert">
                {topicError}
              </p>
            )}
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Quiz name" htmlFor="quiz-title" error={titleError}>
              <Input id="quiz-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <fieldset>
              <legend className="mb-1.5 block text-[14px] font-semibold text-neutral-700">Questions</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="Number of questions">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={count === n}
                    onClick={() => setCount(n)}
                    className={cx(
                      "tabular h-11 flex-1 rounded-md border-[1.5px] font-semibold transition-colors duration-fast",
                      count === n ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {note && (
            <Callout tone={note.ok ? "success" : "danger"} title={note.ok ? "Quiz saved" : "Not saved"}>
              {note.text}
            </Callout>
          )}

          <div className="flex justify-end">
            <Button size="lg" onClick={save} loading={saving}>
              Save quiz set
            </Button>
          </div>

          <Card>
            <CardHeader title="Your saved quizzes" description={sets.length ? plural(sets.length, "quiz", "quizzes") : undefined} />
            <CardBody className="py-2">
              {startError && (
                <Callout tone="danger" className="my-2">
                  {startError}
                </Callout>
              )}
              {sets.length === 0 ? (
                <p className="py-4 text-[14px] text-neutral-600">Nothing saved yet. Your quizzes will show here.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {sets.map((s, i) => (
                    <li key={s.setId || i} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">{s.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-neutral-600">
                          <Badge>{plural(s.questionCount, "question")}</Badge>
                          {s.topicIds.slice(0, 3).map((id) => topicName(id)).join(", ")}
                          {s.topicIds.length > 3 ? ` +${s.topicIds.length - 3} more` : ""}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Play size={14} weight="fill" />}
                        loading={startingId === s.setId}
                        disabled={startingId !== null && startingId !== s.setId}
                        onClick={() => void startSet(s)}
                      >
                        Start
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </AppPage>
  );
}
