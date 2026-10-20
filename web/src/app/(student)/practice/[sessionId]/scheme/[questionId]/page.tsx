"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { getMarkScheme } from "@/lib/api/practice";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { EmptyState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { asArray, isRecord, num, plural, str, toFailure, type LoadFailure } from "@/components/student/studentData";

type Point = { id: string; marks: number | null; text: string; accept: string[]; reject: string[] };
type Level = { label: string; marks: string; descriptor: string };

function parsePoints(scheme: Record<string, unknown>): Point[] {
  const raw = Array.isArray(scheme.markingPoints) ? scheme.markingPoints : asArray(scheme.markingPointsJson);
  return raw.map((mp, i) => {
    if (!isRecord(mp)) return { id: String(i), marks: null, text: str(mp), accept: [], reject: [] };
    return {
      id: str(mp.id, String(i)),
      marks: num(mp.marks),
      text: str(mp.text ?? mp.point ?? mp.description, ""),
      accept: asArray(mp.accept).map((a) => str(a)).filter(Boolean),
      reject: asArray(mp.reject).map((a) => str(a)).filter(Boolean),
    };
  });
}

function parseLevels(scheme: Record<string, unknown>): Level[] {
  return asArray(scheme.levelsJson)
    .filter(isRecord)
    .map((l, i) => ({
      label: str(l.level ?? l.label ?? l.name, `Level ${i + 1}`),
      marks: str(l.marks ?? l.range ?? l.markRange, ""),
      descriptor: str(l.descriptor ?? l.description ?? l.text, ""),
    }));
}

const SCHEME_TYPE: Record<string, string> = {
  POINTS: "Point-based",
  LEVELS: "Levels of response",
  MCQ_KEY: "Multiple-choice key",
};

/** F-02 — Mark scheme reveal (after attempt) */
export default function SchemePage() {
  const { sessionId, questionId } = useParams<{ sessionId: string; questionId: string }>();
  const responseId = useSearchParams().get("responseId");
  const [scheme, setScheme] = useState<Record<string, unknown> | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  useEffect(() => {
    getMarkScheme(questionId)
      .then(setScheme)
      .catch((err: unknown) => setFailure(toFailure(err, "Scheme unavailable.")));
  }, [questionId]);

  const points = scheme ? parsePoints(scheme) : [];
  const levels = scheme ? parseLevels(scheme) : [];
  const total = scheme ? num(scheme.totalMarks) : null;
  const modelAnswer = scheme && scheme.modelAnswer != null ? str(scheme.modelAnswer) : "";
  const type = scheme ? str(scheme.schemeType) : "";

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="After your attempt"
        title="Mark scheme"
        description="What examiners look for on this question."
        actions={
          <ButtonLink href={responseId ? `/practice/${sessionId}/result/${responseId}` : `/practice/${sessionId}`} variant="tertiary" size="sm">
            {responseId ? "Back to result" : "Back to practice"}
          </ButtonLink>
        }
      />

      {failure ? (
        failure.kind === "forbidden" ? (
          <ForbiddenState body="Have a go at the question first — the mark scheme unlocks after your attempt." />
        ) : (
          <FailureView failure={failure} />
        )
      ) : !scheme ? (
        <LoadingState lines={5} />
      ) : (
        <div className="animate-rise space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {type && <Badge tone="brand">{SCHEME_TYPE[type] ?? type.replace(/_/g, " ").toLowerCase()}</Badge>}
            {total != null && <Badge>{plural(total, "mark")} in total</Badge>}
          </div>

          {points.length > 0 && (
            <Card>
              <CardHeader title="Marking points" description="One mark for each point unless shown otherwise." />
              <ol className="divide-y divide-neutral-100">
                {points.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-5 py-4">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-answer-correct" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-neutral-900">{p.text || "—"}</p>
                      {p.accept.length > 0 && (
                        <p className="mt-1 text-caption text-neutral-600">
                          <span className="font-semibold text-neutral-700">Also accept:</span> {p.accept.join("; ")}
                        </p>
                      )}
                      {p.reject.length > 0 && (
                        <p className="mt-0.5 text-caption text-neutral-600">
                          <span className="font-semibold text-neutral-700">Do not accept:</span> {p.reject.join("; ")}
                        </p>
                      )}
                    </div>
                    {p.marks != null && <span className="tabular shrink-0 text-caption font-semibold text-neutral-700">{plural(p.marks, "mark")}</span>}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {levels.length > 0 && (
            <Card>
              <CardHeader title="Levels" />
              <ol className="divide-y divide-neutral-100">
                {levels.map((l, i) => (
                  <li key={i} className="px-5 py-4">
                    <p className="flex items-center justify-between gap-3 font-semibold text-neutral-900">
                      {l.label}
                      {l.marks && <span className="tabular text-caption text-neutral-700">{l.marks} marks</span>}
                    </p>
                    {l.descriptor && <p className="mt-1 text-[14px] text-neutral-700">{l.descriptor}</p>}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {modelAnswer && (
            <Card>
              <CardHeader title="Model answer" />
              <CardBody>
                <p className="whitespace-pre-wrap leading-relaxed text-neutral-800">{modelAnswer}</p>
              </CardBody>
            </Card>
          )}

          {points.length === 0 && levels.length === 0 && !modelAnswer && (
            <EmptyState title="No details for this scheme" body="This question is marked automatically against a fixed key." />
          )}
        </div>
      )}
    </AppPage>
  );
}
