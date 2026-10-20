"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  Bell,
  ChartLineUp,
  ClockCounterClockwise,
  FileText,
  Robot,
  Target,
  UserPlus,
  PencilSimpleLine,
  Exam,
} from "@phosphor-icons/react";
import { listStudents, StudentSchema } from "@/lib/api/students";
import { getParentHome } from "@/lib/api/w2";
import { predictedGrades, weeklyReport } from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, PageHeader, StatTile } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { useSession } from "@/components/shell/session";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { getDailyGoalSummary, listWeeklyReports } from "@/components/parent/api";
import { asRecord, humanise, num, str } from "@/components/parent/format";
import { parseReportStats, weekLabel, type ReportStats } from "@/components/parent/report";

type Student = z.infer<typeof StudentSchema>;

type ChildStats = {
  answeredToday?: number;
  targetToday?: number;
  predictedLow?: string;
  predictedHigh?: string;
  predictedIsEstimate?: boolean;
  latestReportId?: string;
  latestWeekStart?: string;
  lastWeek?: ReportStats;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Best-effort per-child figures; each source can fail on its own without breaking the card. */
async function loadChildStats(studentId: string): Promise<ChildStats> {
  const [goal, predicted, reports] = await Promise.allSettled([
    getDailyGoalSummary(studentId),
    predictedGrades(studentId),
    listWeeklyReports(studentId),
  ]);
  const out: ChildStats = {};
  if (goal.status === "fulfilled") {
    out.answeredToday = goal.value.answered ?? undefined;
    out.targetToday = goal.value.target ?? undefined;
  }
  if (predicted.status === "fulfilled") {
    const p = asRecord(predicted.value);
    out.predictedLow = str(p.gradeLow);
    out.predictedHigh = str(p.gradeHigh);
    out.predictedIsEstimate = p.status === "PREDICTED_STUB";
  }
  if (reports.status === "fulfilled" && reports.value.items[0]) {
    const latest = reports.value.items[0];
    out.latestReportId = latest.reportId;
    out.latestWeekStart = latest.weekStart ?? undefined;
    try {
      const full = asRecord(await weeklyReport(studentId, latest.reportId));
      out.lastWeek = parseReportStats(full.stats);
    } catch {
      /* report body is optional on the card */
    }
  }
  return out;
}

/** Shell-02 — Parent home: children → enrol → child practice */
export default function ParentHomePage() {
  const session = useSession();
  const firstName = (session?.displayName ?? "").split(/\s+/)[0];
  const [openAlerts, setOpenAlerts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, ChildStats | "loading">>({});

  const { state, retry } = useLoad(
    async () => {
      const r = await listStudents();
      return r.items;
    },
    [],
    "Could not load your children",
  );

  useEffect(() => {
    if (state.status !== "ready") return;
    let cancelled = false;
    // H-10 aggregate (open alert counts) is best-effort.
    getParentHome()
      .then((home) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const c of home.children) {
          const r = asRecord(c);
          const id = str(r.studentId);
          if (id) map[id] = num(r.openAlerts) ?? 0;
        }
        setOpenAlerts(map);
      })
      .catch(() => undefined);
    setStats(Object.fromEntries(state.data.map((s) => [s.studentId, "loading" as const])));
    for (const s of state.data) {
      void loadChildStats(s.studentId).then((cs) => {
        if (!cancelled) setStats((prev) => ({ ...prev, [s.studentId]: cs }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <AppPage>
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        description="See how each child is getting on this week, and jump to their reports, AI controls and targets."
        actions={
          <ButtonLink href="/parent/children/new" icon={<UserPlus size={18} aria-hidden />}>
            Add a child
          </ButtonLink>
        }
      />

      <LoadView state={state} onRetry={retry} forbiddenBody="This area is for parent accounts. Sign in with your parent email to see your children.">
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              title="No children added yet"
              body="Add a child to create their learner profile and picture PIN, then choose their subjects."
              action={
                <ButtonLink href="/parent/children/new" icon={<UserPlus size={18} aria-hidden />}>
                  Add a child
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-4" aria-live="polite">
              {items.map((s) => (
                <ChildCard key={s.studentId} student={s} stats={stats[s.studentId]} openAlerts={openAlerts[s.studentId]} />
              ))}
            </div>
          )
        }
      </LoadView>

      <Callout tone="neutral" className="mt-8" title="Practice happens on the child's own login">
        Practice and diagnostics need a child picture-PIN session. After choosing subjects, open{" "}
        <Link className="font-semibold underline" href="/child-login">
          Child login
        </Link>{" "}
        on your child&apos;s device.
      </Callout>
    </AppPage>
  );
}

function ChildCard({
  student: s,
  stats,
  openAlerts,
}: {
  student: Student;
  stats: ChildStats | "loading" | undefined;
  openAlerts: number | undefined;
}) {
  const base = `/parent/children/${s.studentId}`;
  const enrolments = (s.enrolments ?? []).map((e) => asRecord(e));
  const enrolLabels = enrolments
    .map((e) => str(e.title) ?? str(e.specCode) ?? str(e.enrolmentId)?.slice(0, 8))
    .filter((x): x is string => !!x);
  const loading = stats === "loading" || stats === undefined;
  const cs: ChildStats = stats && stats !== "loading" ? stats : {};
  const initials = s.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const tile = (node: ReactNode) => (loading ? <span aria-hidden className="skeleton inline-block h-6 w-16 rounded align-middle" /> : node);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navySoft text-[15px] font-semibold text-brand-navy">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <Link href={base} className="text-[17px] font-semibold text-neutral-900 hover:underline">
              {s.displayName}
            </Link>
            <p className="text-caption text-neutral-600">
              {[s.yearGroup, s.ageBand ? String(s.ageBand) === "U13" ? "Under 13" : `Age ${String(s.ageBand).replace(/^(\d+)_(\d+)$/, "$1–$2").replace(/_/g, " ").toLowerCase()}` : null].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{humanise(s.status)}</Badge>
          {s.requiresUnder13Consent && (
            <Link href={`${base}/consent`}>
              <Badge tone="warning">Under-13 consent needed</Badge>
            </Link>
          )}
          {!!openAlerts && (
            <Link href={`${base}/alerts`}>
              <Badge tone="info">
                <Bell size={12} aria-hidden /> {openAlerts} new alert{openAlerts === 1 ? "" : "s"}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Questions today"
            icon={<PencilSimpleLine size={18} aria-hidden />}
            value={tile(cs.answeredToday != null ? cs.answeredToday : "—")}
            hint={cs.targetToday != null ? `Daily goal ${cs.targetToday}` : undefined}
          />
          <StatTile
            label="Last week"
            icon={<ClockCounterClockwise size={18} aria-hidden />}
            value={tile(cs.lastWeek?.answers != null ? `${cs.lastWeek.answers} answers` : "—")}
            hint={
              cs.lastWeek
                ? [
                    cs.lastWeek.accuracyPercent != null ? `${cs.lastWeek.accuracyPercent}% correct` : null,
                    cs.lastWeek.activeDays != null ? `${cs.lastWeek.activeDays} active day${cs.lastWeek.activeDays === 1 ? "" : "s"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                : loading
                  ? undefined
                  : "No weekly report yet"
            }
          />
          <StatTile
            label="Predicted grade"
            icon={<ChartLineUp size={18} aria-hidden />}
            value={tile(
              cs.predictedLow || cs.predictedHigh
                ? cs.predictedLow === cs.predictedHigh || !cs.predictedHigh
                  ? cs.predictedLow
                  : `${cs.predictedLow ?? "?"}–${cs.predictedHigh}`
                : "—",
            )}
            hint={cs.predictedIsEstimate ? "Early estimate" : cs.predictedLow ? "Band" : undefined}
          />
          <StatTile
            label="Subjects"
            icon={<Exam size={18} aria-hidden />}
            value={enrolLabels.length}
            hint={enrolLabels.length ? enrolLabels.slice(0, 3).join(", ") + (enrolLabels.length > 3 ? "…" : "") : "Not enrolled yet"}
          />
        </div>

        {enrolLabels.length === 0 && (
          <Callout tone="warning">
            {s.displayName} is not enrolled yet.{" "}
            <Link className="font-semibold underline" href={`/onboarding/subjects?studentId=${s.studentId}`}>
              Choose a subject track
            </Link>{" "}
            to start practice.
          </Callout>
        )}

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={base} size="sm" variant="secondary" icon={<ChartLineUp size={16} aria-hidden />}>
            Progress
          </ButtonLink>
          {cs.latestReportId && (
            <ButtonLink
              href={`${base}/reports/${cs.latestReportId}`}
              size="sm"
              variant="tertiary"
              icon={<FileText size={16} aria-hidden />}
              aria-label={`Latest weekly report, ${weekLabel(cs.latestWeekStart)}`}
            >
              Latest report
            </ButtonLink>
          )}
          <ButtonLink href={`${base}/controls`} size="sm" variant="tertiary" icon={<Robot size={16} aria-hidden />}>
            AI controls
          </ButtonLink>
          <ButtonLink href={`${base}/target`} size="sm" variant="tertiary" icon={<Target size={16} aria-hidden />}>
            Target grades
          </ButtonLink>
          <ButtonLink href={`/onboarding/subjects?studentId=${s.studentId}`} size="sm" variant="tertiary">
            {enrolLabels.length ? "Manage subjects" : "Enrol in subjects"}
          </ButtonLink>
          <ButtonLink href="/parent/billing" size="sm" variant="tertiary">
            Billing
          </ButtonLink>
          <ButtonLink href="/child-login" size="sm" variant="tertiary">
            Child login
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}
