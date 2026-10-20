"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { asArray, isRecord, num, plural, questionTypeLabel, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type Version = { version: number; questionId: string; questionText: string; questionType: string; marks: number | null };
type Drill = { sessionId: string | null; versions: Version[] };

function parseDrill(res: unknown): Drill {
  if (!isRecord(res)) return { sessionId: null, versions: [] };
  const versions = asArray(res.versions)
    .filter(isRecord)
    .map((v, i) => {
      const q = isRecord(v.question) ? v.question : {};
      return {
        version: num(v.version) ?? i + 1,
        questionId: str(v.questionId ?? q.questionId),
        questionText: str(q.questionText, "Question"),
        questionType: str(q.questionType),
        marks: num(q.marksAvailable),
      };
    });
  return { sessionId: res.sessionId ? str(res.sessionId) : null, versions };
}

/** D-05 — Multi-version drill */
export default function Page() {
  const [data, setData] = useState<Drill | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const started = useRef(false);

  const load = useCallback(async () => {
    setFailure(null);
    setData(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("enrolmentId required");
      const result: unknown = await api.multiVersion({ enrolmentId, versions: 3 }, token);
      setData(parseDrill(result));
    } catch (e: unknown) {
      const f = toFailure(e, "Could not load");
      setFailure(f.message === "enrolmentId required" ? { kind: "error", message: "No active subject yet — open Home first." } : f);
    }
  }, []);

  useEffect(() => {
    // Each call creates a practice session, so only request once per visit.
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Practice"
        title="Same skill, new versions"
        description="Answer several versions of one kind of question. Spotting what stays the same is how the method sticks."
      />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : !data ? (
        <LoadingState label="Preparing your versions…" lines={4} />
      ) : data.versions.length === 0 || !data.sessionId ? (
        <EmptyState
          title="No versions available yet"
          body="We couldn’t find enough approved questions for this drill. Try a mixed set instead."
          action={<ButtonLink href="/practice">Back to practice</ButtonLink>}
        />
      ) : (
        <div className="animate-rise space-y-5">
          <ol className="space-y-3">
            {data.versions.map((v) => (
              <li key={`${v.version}-${v.questionId}`}>
                <Card className="p-5">
                  <div className="flex items-center justify-between text-caption text-neutral-600">
                    <span className="inline-flex items-center gap-2">
                      <Badge tone="brand">Version {v.version}</Badge>
                      {questionTypeLabel(v.questionType)}
                    </span>
                    {v.marks != null && <span>{plural(v.marks, "mark")}</span>}
                  </div>
                  <p className="mt-3 line-clamp-3 text-neutral-900">{v.questionText}</p>
                </Card>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-neutral-600">{plural(data.versions.length, "question")} · marked as you go</p>
            <ButtonLink href={`/practice/${data.sessionId}`} size="lg" icon={<ArrowRight size={18} />}>
              Start drill
            </ButtonLink>
          </div>
        </div>
      )}
    </AppPage>
  );
}
