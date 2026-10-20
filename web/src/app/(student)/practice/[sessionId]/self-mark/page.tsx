"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Minus, Plus, Scales } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, PageHeader, StatTile } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { asArray, errorText, isRecord, num, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type Compare = { selfMarks: number | null; aiMarks: number | null; delta: number | null; note: string };

/** F-03 — Self-mark mode */
export default function Page() {
  const params = useParams<{ sessionId: string }>();
  const [responseId, setResponseId] = useState<string | null>(null);
  const [scheme, setScheme] = useState<Record<string, unknown> | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = sessionStorage.getItem("accessToken") ?? undefined;
        const rid = sessionStorage.getItem("lastResponseId") || params.sessionId;
        const schemeQ = sessionStorage.getItem("lastQuestionId") || "1";
        let s: unknown = null;
        try {
          s = await api.getMarkScheme(schemeQ, token);
        } catch {
          /* scheme is optional: self-marking still works without it */
        }
        if (!cancelled) {
          setResponseId(rid);
          setScheme(isRecord(s) ? s : null);
        }
      } catch (e: unknown) {
        if (!cancelled) setFailure(toFailure(e, "Could not load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  const total = scheme ? num(scheme.totalMarks) : null;
  const max = total ?? 10;
  const points = scheme ? asArray(scheme.markingPointsJson ?? scheme.markingPoints) : [];

  async function submit() {
    if (!responseId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      await api.selfMark(responseId, { marksAwarded: marks }, token);
      const c: unknown = await api.selfMarkCompare(responseId, token);
      setCompare(
        isRecord(c)
          ? { selfMarks: num(c.selfMarks), aiMarks: num(c.aiMarks), delta: num(c.delta), note: str(c.calibrationNote) }
          : { selfMarks: marks, aiMarks: null, delta: null, note: "" },
      );
    } catch (e) {
      setSaveError(errorText(e, "We couldn't save your mark."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Practice" title="Mark your own answer" description="Use the mark scheme to give yourself a mark, then compare it with ours. It’s a great way to learn what examiners want." />

      {loading ? (
        <LoadingState lines={4} />
      ) : failure ? (
        <FailureView failure={failure} />
      ) : (
        <div className="animate-rise space-y-5">
          {points.length > 0 && (
            <Card>
              <CardHeader title="Mark scheme" description={total != null ? `${total} marks available` : undefined} />
              <CardBody>
                <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-neutral-800">
                  {points.map((p, i) => (
                    <li key={i}>{isRecord(p) ? str(p.point ?? p.text, "—") : str(p, "—")}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {!compare ? (
            <Card className="p-6">
              <p className="text-center font-semibold text-neutral-900" id="self-mark-label">
                How many marks would you give yourself?
              </p>
              <div className="mt-4 flex items-center justify-center gap-4" role="group" aria-labelledby="self-mark-label">
                <Button variant="secondary" aria-label="One mark fewer" disabled={marks <= 0} onClick={() => setMarks((m) => Math.max(0, m - 1))}>
                  <Minus size={18} />
                </Button>
                <output aria-live="polite" className="tabular w-24 text-center text-[36px] font-bold text-neutral-900">
                  {marks}
                  {total != null && <span className="text-[18px] font-medium text-neutral-500"> / {total}</span>}
                </output>
                <Button variant="secondary" aria-label="One mark more" disabled={marks >= max} onClick={() => setMarks((m) => Math.min(max, m + 1))}>
                  <Plus size={18} />
                </Button>
              </div>
              {saveError && (
                <Callout tone="danger" className="mt-4">
                  {saveError}
                </Callout>
              )}
              <div className="mt-6 flex justify-center">
                <Button size="lg" onClick={submit} loading={saving} disabled={!responseId}>
                  Save and compare
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4" aria-live="polite">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Your mark" value={compare.selfMarks ?? marks} />
                <StatTile label="Our mark" value={compare.aiMarks ?? "—"} hint={compare.aiMarks == null ? "Still being marked" : undefined} />
                <StatTile
                  label="Difference"
                  icon={<Scales size={18} />}
                  value={compare.delta == null ? "—" : compare.delta > 0 ? `+${compare.delta}` : String(compare.delta)}
                  hint={compare.delta == null ? undefined : compare.delta === 0 ? "Spot on" : compare.delta > 0 ? "You were a bit generous" : "You were a bit strict"}
                />
              </div>
              {compare.note && <Callout tone="info">{compare.note}</Callout>}
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={`/practice/${params.sessionId}`}>Back to practice</ButtonLink>
                <ButtonLink href="/practice" variant="secondary">
                  All practice
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      )}
    </AppPage>
  );
}
