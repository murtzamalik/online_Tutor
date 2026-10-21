"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bell, CheckCircle, ClockCounterClockwise, PencilSimpleLine, Printer } from "@phosphor-icons/react";
import { getActionPlan, getAlerts } from "@/lib/api/w2";
import { weeklyReport } from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  MasteryBadge,
  MasteryRing,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ChildHeader, type ChildTab } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { getDailyGoalSummary, listWeeklyReports, type WeeklyReportSummary } from "@/components/parent/api";
import { asArray, asRecord, errorMessage, formatDate, formatRelative, humanise, num, str } from "@/components/parent/format";
import { parseReportStats, weekLabel, type ReportStats } from "@/components/parent/report";

type Alert = { alertId: string; kind?: string; severity?: string; message?: string; status?: string; createdAt?: unknown };

function toAlert(v: unknown): Alert {
  const r = asRecord(v);
  return {
    alertId: str(r.alertId) ?? "",
    kind: str(r.kind),
    severity: str(r.severity),
    message: str(r.message),
    status: str(r.status),
    createdAt: r.createdAt,
  };
}

/** H-01 — Child progress overview (action plan, alerts, weekly reports). */
export default function ParentProgressPage() {
  const { id } = useParams<{ id: string }>();
  const base = `/parent/children/${id}`;

  const { state, retry } = useLoad(
    async () => {
      const [p, a] = await Promise.all([getActionPlan(id), getAlerts(id)]);
      return { plan: asRecord(p), alerts: a.items.map(toAlert) };
    },
    [id],
    "Could not load progress",
  );

  const [reports, setReports] = useState<WeeklyReportSummary[] | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [lastWeek, setLastWeek] = useState<ReportStats | null>(null);
  const [today, setToday] = useState<{ answered?: number; target?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReports(null);
    setReportsError(null);
    listWeeklyReports(id)
      .then(async (r) => {
        if (cancelled) return;
        setReports(r.items);
        const latest = r.items[0];
        if (latest) {
          try {
            const full = asRecord(await weeklyReport(id, latest.reportId));
            if (!cancelled) setLastWeek(parseReportStats(full.stats));
          } catch {
            /* optional */
          }
        }
      })
      .catch((e) => !cancelled && setReportsError(errorMessage(e, "Could not load weekly reports")));
    getDailyGoalSummary(id)
      .then((g) => !cancelled && setToday({ answered: g.answered ?? undefined, target: g.target ?? undefined }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  const [active, setActive] = useState<ChildTab>("overview");
  const reportsSettled = reports !== null || reportsError !== null;

  /** Deep link /parent/children/{id}#reports (also the /reports redirect): highlight the tab and scroll once loaded. */
  useEffect(() => {
    if (!reportsSettled) return;
    let timer = 0;
    const sync = () => {
      if (window.location.hash === "#reports") {
        setActive("reports");
        // Cards above the reports finish loading after them and push them down; scroll once settled.
        window.clearTimeout(timer);
        timer = window.setTimeout(() => document.getElementById("reports")?.scrollIntoView({ block: "start" }), 400);
      } else {
        setActive("overview");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [reportsSettled]);

  function onTabClick(key: ChildTab) {
    if (key === "reports") {
      setActive("reports");
      document.getElementById("reports")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (key === "overview") {
      setActive("overview");
    }
  }

  const openAlerts = state.status === "ready" ? state.data.alerts.filter((a) => a.status === "NEW").length : undefined;

  return (
    <AppPage>
      <ChildHeader
        studentId={id}
        active={active}
        onTabClick={onTabClick}
        title="Progress overview"
        description="This week's activity, the current action plan and recent weekly reports."
        actions={
          <ButtonLink href={`${base}/action-plan/print`} variant="secondary" size="sm" icon={<Printer size={16} aria-hidden />}>
            Print action plan
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Questions today"
          icon={<PencilSimpleLine size={18} aria-hidden />}
          value={today?.answered ?? "—"}
          hint={today?.target != null ? `Daily goal ${today.target}` : undefined}
        />
        <StatTile
          label="Answers last week"
          icon={<ClockCounterClockwise size={18} aria-hidden />}
          value={lastWeek?.answers ?? "—"}
          hint={lastWeek?.activeDays != null ? `${lastWeek.activeDays} active day${lastWeek.activeDays === 1 ? "" : "s"}` : undefined}
        />
        <StatTile
          label="Correct last week"
          icon={<CheckCircle size={18} aria-hidden />}
          value={lastWeek?.accuracyPercent != null ? `${lastWeek.accuracyPercent}%` : "—"}
          hint={lastWeek?.correct != null && lastWeek.answers ? `${lastWeek.correct} of ${lastWeek.answers}` : undefined}
        />
        <StatTile
          label="New alerts"
          icon={<Bell size={18} aria-hidden />}
          value={openAlerts ?? "—"}
          hint={<Link className="font-semibold text-brand-navy hover:underline" href={`${base}/alerts`}>View alerts</Link>}
        />
      </div>

      <div className="mt-6" aria-live="polite">
        <LoadView state={state} onRetry={retry}>
          {({ plan, alerts }) => {
            const actions = asArray(plan.actions).filter((a): a is string => typeof a === "string");
            const focus = asArray(plan.focusTopics).map((t) => asRecord(t));
            return (
              <div className="grid gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                  <CardHeader title="Action plan" description="Small, specific steps for the week ahead." />
                  <CardBody className="space-y-5">
                    {actions.length > 0 ? (
                      <ul className="space-y-2">
                        {actions.map((a) => (
                          <li key={a} className="flex items-start gap-2.5 text-[15px] text-neutral-800">
                            <CheckCircle size={18} className="mt-0.5 shrink-0 text-brand-teal" aria-hidden />
                            {a}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[14px] text-neutral-600">No actions yet — they appear once your child has practised.</p>
                    )}
                    {focus.length > 0 && (
                      <div>
                        <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-neutral-600">Focus topics</p>
                        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
                          {focus.map((t, i) => {
                            const p = num(t.pKnow);
                            return (
                              <li key={String(t.topicId ?? i)} className="flex items-center justify-between gap-3 px-3 py-2">
                                <span className="flex items-center gap-3">
                                  <MasteryRing value={p} size={36} label={String(t.topicName ?? `Topic ${String(t.topicId ?? "")}`)} />
                                  <span className="text-[14px] text-neutral-800">{String(t.topicName ?? `Topic ${String(t.topicId ?? "—")}`)}</span>
                                </span>
                                <MasteryBadge value={p} />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Recent alerts"
                    action={
                      <Link href={`${base}/alerts`} className="text-caption font-semibold text-brand-navy hover:underline">
                        All alerts
                      </Link>
                    }
                  />
                  <CardBody>
                    {alerts.length === 0 ? (
                      <p className="text-[14px] text-neutral-600">No alerts. We&apos;ll let you know if practice drops off.</p>
                    ) : (
                      <ul className="space-y-3">
                        {alerts.slice(0, 3).map((a) => (
                          <li key={a.alertId} className="rounded-md border border-neutral-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-caption font-semibold text-neutral-700">{humanise(a.kind, "Alert")}</span>
                              <Badge tone={a.status === "NEW" ? "info" : "neutral"}>{a.status === "NEW" ? "New" : "Seen"}</Badge>
                            </div>
                            <p className="mt-1 text-[14px] text-neutral-800">{a.message ?? "—"}</p>
                            <p className="mt-1 text-caption text-neutral-600">{formatRelative(a.createdAt)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              </div>
            );
          }}
        </LoadView>
      </div>

      <section id="reports" className="mt-8 scroll-mt-24" aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="mb-3 text-h2 text-neutral-900">
          Weekly reports
        </h2>
        {reports === null && !reportsError && <LoadingState lines={2} />}
        {reportsError && <ErrorState body={reportsError} />}
        {reports && reports.length === 0 && (
          <EmptyState title="No weekly reports yet" body="A report is written every Monday once your child has practised during the week." />
        )}
        {reports && reports.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Week</Th>
                <Th className="hidden sm:table-cell">Ready</Th>
                <Th className="text-right">
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportId}>
                  <Td className="font-medium">{weekLabel(r.weekStart)}</Td>
                  <Td className="hidden text-neutral-600 sm:table-cell">{formatDate(r.createdAt)}</Td>
                  <Td className="text-right">
                    <Link href={`${base}/reports/${r.reportId}`} className="text-[14px] font-semibold text-brand-navy hover:underline">
                      View report
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </AppPage>
  );
}
