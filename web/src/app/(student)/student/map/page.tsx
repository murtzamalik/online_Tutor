"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UsersThree } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Card, MASTERY, MasteryBadge, MasteryRing, PageHeader, masteryLevel } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { asArray, isRecord, num, plural, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w4";

type MapNode = { topicId: number; label: string; masteryProbability: number; attempts: number };

function parseNodes(data: unknown): MapNode[] {
  const nodes = isRecord(data) ? asArray(data.nodes) : [];
  return nodes.filter(isRecord).map((n) => ({
    topicId: num(n.topicId) ?? 0,
    label: str(n.label, "Topic"),
    masteryProbability: num(n.masteryProbability) ?? 0,
    attempts: num(n.attempts) ?? 0,
  }));
}

/** H-06 Knowledge / skill map — grouped by mastery band, keyboard-accessible list (no gamification badges). */
export default function SkillMapPage() {
  const [nodes, setNodes] = useState<MapNode[] | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  const load = useCallback(() => {
    const studentId = sessionStorage.getItem("studentId") ?? "";
    setFailure(null);
    setNodes(null);
    if (!studentId) {
      setFailure({ kind: "error", message: "Sign in as a student" });
      return;
    }
    api
      .skillMap(studentId)
      .then((d: unknown) => setNodes(parseNodes(d)))
      .catch((e: unknown) => setFailure(toFailure(e, "Could not load map")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Highest band first, so progress reads top-down.
  const bands = [...MASTERY].reverse().map((band) => ({
    ...band,
    items: (nodes ?? []).filter((n) => masteryLevel(n.masteryProbability) === band.level),
  }));
  const practised = (nodes ?? []).filter((n) => n.attempts > 0).length;
  const avg = nodes && nodes.length ? nodes.reduce((s, n) => s + n.masteryProbability, 0) / nodes.length : 0;

  return (
    <AppPage>
      <PageHeader
        title="Your progress"
        description="Every topic in your course, grouped by how secure it is. It updates as you practise."
        actions={
          <ButtonLink href="/student/benchmark" variant="tertiary" size="sm" icon={<UsersThree size={16} />}>
            Compare with others
          </ButtonLink>
        }
      />

      {failure ? (
        <FailureView failure={failure} onRetry={load} />
      ) : nodes === null ? (
        <LoadingState lines={6} />
      ) : nodes.length === 0 ? (
        <EmptyState title="Your map is empty" body="Practise a few topics to grow your map." action={<ButtonLink href="/practice">Start practising</ButtonLink>} />
      ) : (
        <div className="animate-rise space-y-6">
          <Card className="flex flex-wrap items-center gap-6 p-5">
            <MasteryRing value={avg} size={64} label="Overall mastery" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-900">Overall</p>
              <MasteryBadge value={avg} />
              <p className="tabular mt-1 text-[14px] text-neutral-600">
                {practised} of {plural(nodes.length, "topic")} practised
              </p>
            </div>
            <dl className="grid grid-cols-4 gap-4 text-center">
              {bands.map((b) => (
                <div key={b.level}>
                  <dt className="flex items-center justify-center gap-1.5 text-caption text-neutral-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} aria-hidden />
                    <span className="hidden sm:inline">{b.label}</span>
                    <span className="sr-only sm:hidden">{b.label}</span>
                  </dt>
                  <dd className="tabular text-[20px] font-bold text-neutral-900">{b.items.length}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {bands
            .filter((b) => b.items.length > 0)
            .map((b) => (
              <section key={b.level} aria-labelledby={`band-${b.level}`}>
                <h2 id={`band-${b.level}`} className="mb-3 flex items-center gap-2 text-h2">
                  <span className="h-3 w-3 rounded-full" style={{ background: b.color }} aria-hidden />
                  {b.label}
                  <span className="tabular text-[15px] font-medium text-neutral-600">({b.items.length})</span>
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
                  {b.items.map((n) => (
                    <li key={n.topicId}>
                      <Link
                        id={`topic-${n.topicId}`}
                        href={`/revise/notes/${n.topicId}`}
                        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3.5 transition-shadow duration-fast hover:shadow-raised"
                      >
                        <MasteryRing value={n.masteryProbability} size={44} label={n.label} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-neutral-900">{n.label}</span>
                          <span className="tabular text-caption text-neutral-600">
                            {n.attempts > 0 ? `${plural(n.attempts, "attempt")}` : "Not practised yet"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </AppPage>
  );
}
