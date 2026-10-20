"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Exam, ListNumbers, Timer } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardHeader, PageHeader, type Tone } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { errorText, formatDate, isRecord, num, str } from "@/components/student/studentData";
import { listMockPapers } from "@/lib/api/settings";
import * as api from "@/lib/api/w3";

type PastMock = { mockId: string; status: string; score: number | null; totalMarks: number | null; durationMinutes: number | null; createdAt: unknown };

const DURATIONS = [30, 45, 60, 90];

const STATUS: Record<string, { label: string; tone: Tone }> = {
  SETUP: { label: "Not started", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  MARKED: { label: "Marked", tone: "success" },
};

/** D-02 — Mock paper setup */
export default function Page() {
  const [enrolmentId, setEnrolmentId] = useState<string | null | undefined>(undefined);
  const [duration, setDuration] = useState(45);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<PastMock[] | null>(null);

  useEffect(() => {
    setEnrolmentId(sessionStorage.getItem("enrolmentId"));
    const studentId = sessionStorage.getItem("studentId");
    if (!studentId) {
      setPast([]);
      return;
    }
    listMockPapers(studentId)
      .then((r) =>
        setPast(
          r.items.map((m) => ({
            mockId: str(m.mockId),
            status: str(m.status),
            score: num(m.score),
            totalMarks: num(m.totalMarks),
            durationMinutes: num(m.durationMinutes),
            createdAt: m.createdAt,
          })),
        ),
      )
      .catch(() => setPast([]));
  }, []);

  async function assemble() {
    const eid = sessionStorage.getItem("enrolmentId");
    if (!eid) {
      setError("No active subject yet — open Home first.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const r: unknown = await api.createMock({ enrolmentId: eid, durationMinutes: duration }, token);
      if (isRecord(r) && r.mockId) location.href = `/mock/${str(r.mockId)}/sit`;
      else setCreating(false);
    } catch (e) {
      setError(errorText(e, "We couldn't build your mock paper."));
      setCreating(false);
    }
  }

  return (
    <AppPage width="content">
      <PageHeader title="Mock exam" description="A timed paper in exam conditions. One question at a time, with a clock you can see." />

      {enrolmentId === undefined ? (
        <LoadingState />
      ) : !enrolmentId ? (
        <EmptyState
          title="Choose a subject first"
          body="Mock papers are built from your subject. Open Home to load it, or choose one now."
          action={<ButtonLink href="/home">Go to Home</ButtonLink>}
        />
      ) : (
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
              <Exam size={22} />
            </span>
            <div>
              <h2 className="text-h2">Set up your paper</h2>
              <p className="text-[14px] text-neutral-600">Questions are picked from your specification.</p>
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-neutral-700">
              <Clock size={16} aria-hidden /> How long?
            </legend>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Paper length">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={duration === d}
                  onClick={() => setDuration(d)}
                  className={cx(
                    "rounded-md border-[1.5px] px-2 py-3 text-center transition-colors duration-fast",
                    duration === d ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400",
                  )}
                >
                  <span className="tabular block text-[18px] font-bold">{d}</span>
                  <span className={cx("text-caption", duration === d ? "text-white/80" : "text-neutral-600")}>minutes</span>
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="mt-6 space-y-2 text-[14px] text-neutral-700">
            <li className="flex items-center gap-2">
              <ListNumbers size={18} className="text-neutral-400" aria-hidden /> Up to 10 questions, answered in any order
            </li>
            <li className="flex items-center gap-2">
              <Timer size={18} className="text-neutral-400" aria-hidden /> Extra time from your{" "}
              <Link href="/settings/accessibility" className="font-semibold text-brand-navy hover:underline">
                accessibility settings
              </Link>{" "}
              is added automatically
            </li>
          </ul>

          {error && (
            <Callout tone="danger" title="Paper not created" className="mt-6">
              {error}
            </Callout>
          )}

          <div className="mt-8 flex justify-end">
            <Button size="lg" onClick={assemble} loading={creating}>
              Assemble mock
            </Button>
          </div>
        </Card>
      )}

      {past && past.length > 0 && (
        <Card className="mt-8">
          <CardHeader title="Your mock papers" />
          <ul className="divide-y divide-neutral-100">
            {past.map((m) => {
              const s = STATUS[m.status] ?? { label: m.status, tone: "neutral" as Tone };
              const done = m.status === "MARKED" || m.status === "SUBMITTED";
              return (
                <li key={m.mockId}>
                  <Link
                    href={done ? `/mock/${m.mockId}/results` : `/mock/${m.mockId}/sit`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-050"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-neutral-900">{formatDate(m.createdAt)}</span>
                      <span className="tabular text-caption text-neutral-600">
                        {m.durationMinutes != null ? `${m.durationMinutes} min` : ""}
                        {done && m.score != null && m.totalMarks != null ? ` · ${m.score} / ${m.totalMarks} marks` : ""}
                      </span>
                    </span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </AppPage>
  );
}
