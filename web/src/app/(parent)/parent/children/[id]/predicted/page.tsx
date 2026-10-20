"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Callout, Card, CardBody, CardHeader, KeyValue, StatTile } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, formatDateTime, num, str } from "@/components/parent/format";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** H-04 — Predicted grade band */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  const { state, retry } = useLoad(
    async () => asRecord(await api.predictedGrades(params.id, token)),
    [params.id, token],
    "Could not load the predicted grade",
  );

  return (
    <AppPage>
      <ChildHeader
        studentId={params.id}
        active="predicted"
        title="Predicted grade band"
        description="A range, not a promise. It narrows as your child answers more exam-style questions."
      />
      <LoadView state={state} onRetry={retry}>
        {(p) => {
          const low = str(p.gradeLow);
          const high = str(p.gradeHigh) ?? low;
          const point = str(p.gradePoint);
          const confidence = num(p.confidence);
          const estimate = p.status === "PREDICTED_STUB";
          const lowIdx = low ? GRADES.indexOf(low) : -1;
          const highIdx = high ? GRADES.indexOf(high) : -1;
          const band = low && high && low !== high ? `${low}–${high}` : low ?? "—";
          return (
            <div className="space-y-6">
              {estimate && (
                <Callout tone="info" title="Early estimate">
                  We don&apos;t have enough answers yet to make a proper prediction, so this is a starting range. Check back after a
                  few practice sessions.
                </Callout>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile label="Predicted band" value={`Grade ${band}`} />
                <StatTile label="Most likely" value={point ? `Grade ${point}` : "—"} />
                <StatTile
                  label="Confidence"
                  value={confidence != null ? `${Math.round((confidence <= 1 ? confidence * 100 : confidence))}%` : "—"}
                  className="col-span-2 lg:col-span-1"
                />
              </div>

              <Card>
                <CardHeader title="Where the band sits" description="GCSE grades 1 to 9." />
                <CardBody>
                  <div className="grid grid-cols-9 gap-1" role="img" aria-label={`Predicted band grade ${band} on a 1 to 9 scale`}>
                    {GRADES.map((g, i) => {
                      const inBand = lowIdx >= 0 && highIdx >= 0 && i >= Math.min(lowIdx, highIdx) && i <= Math.max(lowIdx, highIdx);
                      const isPoint = point === g;
                      return (
                        <div key={g} className="text-center">
                          <div
                            className={cx(
                              "h-8 rounded",
                              inBand ? "bg-brand-teal" : "bg-neutral-100",
                              isPoint && "ring-2 ring-brand-navy ring-offset-2",
                            )}
                          />
                          <span className={cx("tabular mt-1 block text-caption", inBand ? "font-semibold text-neutral-900" : "text-neutral-600")}>
                            {g}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <KeyValue
                    className="mt-5"
                    items={[
                      ["Last calculated", estimate ? "Not yet" : formatDateTime(p.computedAt)],
                      [
                        "Want to aim higher?",
                        <Link key="t" href={`/parent/children/${params.id}/target`} className="font-semibold text-brand-navy hover:underline">
                          Set a target grade
                        </Link>,
                      ],
                    ]}
                  />
                </CardBody>
              </Card>
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
