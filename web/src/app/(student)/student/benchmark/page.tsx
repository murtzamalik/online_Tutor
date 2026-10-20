"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView, ProgressBar } from "@/components/student/StudentUI";
import { formatDate, isRecord, num, parseJsonish, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w4";

type Bench = {
  available: boolean;
  optedIn: boolean;
  sampleSize: number;
  minSampleSize: number;
  message: string;
  percentile: number | null;
  edges: Array<[string, string]>;
  period: string;
  computedAt: unknown;
};

function parseBench(d: unknown): Bench {
  const r = isRecord(d) ? d : {};
  const b = isRecord(r.benchmark) ? r.benchmark : {};
  const edgesRaw = parseJsonish(b.percentileEdgesJson);
  const edges: Array<[string, string]> = isRecord(edgesRaw)
    ? Object.entries(edgesRaw).map(([k, v]) => [k.toUpperCase(), str(v, "—")] as [string, string])
    : Array.isArray(edgesRaw)
      ? edgesRaw.map((v, i) => [`Band ${i + 1}`, str(v, "—")] as [string, string])
      : [];
  return {
    available: r.available === true,
    optedIn: r.optedIn === true,
    sampleSize: num(r.sampleSize) ?? 0,
    minSampleSize: num(r.minSampleSize) ?? 50,
    message: str(r.message ?? r.emptyReason),
    percentile: num(b.percentile ?? b.rank),
    edges,
    period: str(b.period),
    computedAt: b.computedAt,
  };
}

/** H-07 Cohort benchmark — honest empty unless opted in and n ≥ minimum sample. */
export default function BenchmarkPage() {
  const [data, setData] = useState<Bench | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  const load = useCallback(() => {
    const studentId = sessionStorage.getItem("studentId") ?? "";
    setFailure(null);
    setData(null);
    if (!studentId) {
      setFailure({ kind: "error", message: "Sign in as a student" });
      return;
    }
    api
      .cohortBenchmark(studentId)
      .then((d: unknown) => setData(parseBench(d)))
      .catch((e: unknown) => setFailure(toFailure(e, "Could not load benchmark")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Progress"
        title="Compare with others"
        description="An anonymised view of how learners on your course are doing. No names, ever."
        actions={<ButtonLink href="/student/map" variant="tertiary" size="sm">Back to progress</ButtonLink>}
      />

      {failure ? (
        <FailureView failure={failure} onRetry={load} />
      ) : !data ? (
        <LoadingState lines={4} />
      ) : !data.available ? (
        <Card className="animate-rise p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <UsersThree size={24} />
          </span>
          <h2 className="mt-3 text-h2">Not available yet</h2>
          <p className="mx-auto mt-1 max-w-md text-neutral-600">{data.message || "There isn’t enough data to compare fairly yet."}</p>
          {data.optedIn ? (
            <div className="mx-auto mt-5 max-w-xs text-left">
              <p className="tabular mb-1.5 text-caption text-neutral-600">
                {data.sampleSize} of {data.minSampleSize} learners needed
              </p>
              <ProgressBar value={data.sampleSize} max={data.minSampleSize} label="Learners in cohort" tone="teal" />
            </div>
          ) : (
            <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-1.5 text-caption text-neutral-600">
              <ShieldCheck size={16} aria-hidden /> A parent can turn this on in privacy settings.
            </p>
          )}
          <div className="mt-6">
            <ButtonLink href="/student/map">Back to progress</ButtonLink>
          </div>
        </Card>
      ) : (
        <div className="animate-rise space-y-4" aria-live="polite">
          {data.message && <p className="text-neutral-700">{data.message}</p>}
          {data.percentile != null && (
            <Card className="p-6 text-center">
              <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Your percentile</p>
              <p className="tabular mt-1 text-[40px] font-bold text-brand-navy">{data.percentile}</p>
            </Card>
          )}
          <Card>
            <CardHeader
              title="Cohort snapshot"
              description={data.period ? `Period: ${data.period}` : undefined}
              action={<Badge tone="teal">{data.sampleSize} learners</Badge>}
            />
            <div className="px-5 py-2">
              <KeyValue
                items={[
                  ...data.edges,
                  ...(data.computedAt ? ([["Last updated", formatDate(data.computedAt)]] as Array<[string, string]>) : []),
                ]}
              />
            </div>
          </Card>
        </div>
      )}
    </AppPage>
  );
}
