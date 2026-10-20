"use client";

import { useParams } from "next/navigation";
import { CalendarCheck, CheckCircle, PencilSimpleLine, Printer } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardBody, CardHeader, StatTile } from "@/components/ui/primitives";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { Narrative } from "@/components/parent/Narrative";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, str } from "@/components/parent/format";
import { parseReportStats, weekLabel } from "@/components/parent/report";

/** H-03 — Weekly narrative report */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  const { state, retry } = useLoad(
    async () => asRecord(await api.weeklyReport(params.id, params.reportId, token)),
    [params.id, params.reportId, token],
    "Could not load this report",
  );

  const title = state.status === "ready" ? `Weekly report · ${weekLabel(state.data.weekStart)}` : "Weekly report";

  return (
    <AppPage>
      <ChildHeader
        studentId={params.id}
        active="reports"
        title={title}
        description="What your child worked on last week, written from their real practice data."
        actions={
          state.status === "ready" ? (
            <Button variant="secondary" size="sm" icon={<Printer size={16} aria-hidden />} onClick={() => window.print()}>
              Print
            </Button>
          ) : undefined
        }
      />
      <LoadView state={state} onRetry={retry} forbiddenBody="Only the parent linked to this child can open their reports.">
        {(r) => {
          const stats = parseReportStats(r.stats);
          const narrative = str(r.narrative);
          return (
            <div className="space-y-6 animate-rise">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile label="Answers" icon={<PencilSimpleLine size={18} aria-hidden />} value={stats.answers ?? "—"} />
                <StatTile
                  label="Correct"
                  icon={<CheckCircle size={18} aria-hidden />}
                  value={stats.accuracyPercent != null ? `${stats.accuracyPercent}%` : "—"}
                  hint={stats.correct != null && stats.answers ? `${stats.correct} of ${stats.answers}` : undefined}
                />
                <StatTile
                  label="Active days"
                  icon={<CalendarCheck size={18} aria-hidden />}
                  value={stats.activeDays != null ? `${stats.activeDays} of 7` : "—"}
                  className="col-span-2 lg:col-span-1"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader title="Summary" />
                  <CardBody>
                    {narrative ? (
                      <Narrative markdown={narrative} />
                    ) : (
                      <p className="text-neutral-600">No written summary for this week.</p>
                    )}
                  </CardBody>
                </Card>
                <div className="space-y-6">
                  <TopicList title="Topics practised" items={stats.topicsPractised} empty="No practice recorded this week." tone="brand" />
                  <TopicList
                    title="Room to grow"
                    items={stats.weakestTopics}
                    empty="Not enough answers yet to suggest focus topics."
                    tone="warning"
                  />
                </div>
              </div>
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}

function TopicList({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "brand" | "warning" }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {items.length === 0 ? (
          <p className="text-[14px] text-neutral-600">{empty}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {items.map((t) => (
              <li key={t}>
                <Badge tone={tone}>{t}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
