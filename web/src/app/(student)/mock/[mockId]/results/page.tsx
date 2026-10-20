"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Exam, Percent, Trophy } from "@phosphor-icons/react";
import { createMockPaper, mockResults } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardHeader, MasteryBadge, PageHeader, StatTile } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView, ProgressBar } from "@/components/student/StudentUI";
import { asArray, formatDate, isRecord, num, str, toFailure, type LoadFailure } from "@/components/student/studentData";

type TopicRow = { label: string; topicNumber: string; score: number | null; marks: number | null };

function readResult(r: Record<string, unknown>) {
  const result = isRecord(r.result) ? r.result : {};
  const topics: TopicRow[] = asArray(result.topics)
    .filter(isRecord)
    .map((t) => ({ label: str(t.label ?? t.topicName, "Topic"), topicNumber: str(t.topicNumber), score: num(t.score), marks: num(t.marks) }));
  const score = num(r.score) ?? num(result.marksAwarded) ?? num(result.score);
  const total = num(r.totalMarks);
  const pct = num(result.overallPct) ?? (score != null && total ? Math.round((score / total) * 100) : null);
  const grade = str(result.gradeEstimate ?? result.grade ?? r.gradeEstimate ?? r.grade);
  return { topics, score, total, pct, grade, note: str(result.note), status: str(r.status), submittedAt: r.submittedAt };
}

/** D-11 — Mock paper results */
export default function MockResultsPage() {
  const params = useParams<{ mockId: string }>();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await mockResults(params.mockId);
      setResult(r);
      setFailure(null);
    } catch (err) {
      setFailure(toFailure(err, "Could not load results"));
    }
  }, [params.mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDemo() {
    setCreating(true);
    setDemoError(null);
    try {
      const created = await createMockPaper();
      const id = String(created.mockId ?? created.mock_id ?? "");
      if (id) {
        window.location.href = `/mock/${id}/results`;
        return;
      }
    } catch (err) {
      setDemoError(err instanceof ApiError ? err.message : "Could not create demo mock");
    }
    setCreating(false);
  }

  const r = result ? readResult(result) : null;

  return (
    <AppPage>
      <PageHeader
        title="Mock results"
        description={r?.submittedAt ? `Submitted ${formatDate(r.submittedAt, { day: "numeric", month: "long", year: "numeric" })}` : "How you did, topic by topic."}
        actions={<ButtonLink href="/mock/new" variant="secondary" size="sm">New mock paper</ButtonLink>}
      />

      {failure ? (
        <div className="space-y-4">
          <FailureView failure={failure} onRetry={() => void load()} />
          {failure.kind === "error" && (
            <div className="flex flex-col items-center gap-2">
              <Button variant="tertiary" onClick={createDemo} loading={creating}>
                Create demo completed mock
              </Button>
              {demoError && <Callout tone="danger">{demoError}</Callout>}
            </div>
          )}
        </div>
      ) : !r ? (
        <LoadingState lines={5} />
      ) : (
        <div className="animate-rise space-y-6" aria-live="polite">
          {r.status && r.status !== "MARKED" && (
            <Callout tone="info" title="Still being marked">
              Your full breakdown appears once marking finishes.
            </Callout>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Score" icon={<Exam size={18} />} value={r.score != null ? `${r.score}${r.total != null ? ` / ${r.total}` : ""}` : "—"} hint="marks" />
            <StatTile label="Percentage" icon={<Percent size={18} />} value={r.pct != null ? `${r.pct}%` : "—"} />
            <StatTile label="Estimated grade" icon={<Trophy size={18} />} value={r.grade || "—"} hint={r.grade ? "Based on this paper only" : "Shown after a few more papers"} />
          </div>

          <Card>
            <CardHeader title="Topic breakdown" description={r.note || undefined} />
            {r.topics.length === 0 ? (
              <p className="px-5 py-6 text-[14px] text-neutral-600">No topic breakdown for this paper yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {r.topics.map((t, i) => {
                  const ratio = t.score != null && t.marks ? t.score / t.marks : null;
                  return (
                    <li key={`${t.topicNumber}-${i}`} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900">
                          {t.topicNumber && <span className="tabular mr-1.5 text-neutral-600">{t.topicNumber}</span>}
                          {t.label}
                        </p>
                        <span className="flex items-center gap-3">
                          <MasteryBadge value={ratio} />
                          <span className="tabular text-[14px] font-semibold text-neutral-800">
                            {t.score ?? "—"} / {t.marks ?? "—"}
                          </span>
                        </span>
                      </div>
                      <ProgressBar value={t.score ?? 0} max={t.marks ?? 1} label={`${t.label} marks`} className="mt-2" tone="teal" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-neutral-900">Next step</p>
              <p className="text-[14px] text-neutral-600">Have another go at the questions that slipped.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">Recommended</Badge>
              <ButtonLink href="/practice/redrill">Redrill missed questions</ButtonLink>
            </div>
          </Card>
        </div>
      )}
    </AppPage>
  );
}
