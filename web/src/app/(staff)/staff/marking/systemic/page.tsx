"use client";

import { ArrowClockwise, ArrowRight } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, PageHeader, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { DataState, Meter, StatRow, useAccessToken, useApi } from "@/components/staff/ops";
import { humanise, int, num, str, type Row } from "@/components/staff/format";
import * as api from "@/lib/api/w3";

const TRIGGER_HELP: Record<string, string> = {
  LOW_CONFIDENCE: "The marker was unsure. Check whether the mark scheme covers common answer forms.",
  PASS_DISAGREEMENT: "Two marking passes disagreed. Often a sign of an ambiguous marking point.",
  STUDENT_DISPUTE: "Pupils challenged the mark. Review wording of feedback and the scheme.",
  SCHEMA_FAILURE: "The marker returned an invalid result. Raise with AI engineering.",
};

type Issue = { trigger: string; count: number };

/** M-03 — Systemic marking issues: exception volume by trigger over the last 30 days. */
export default function SystemicIssuesPage() {
  const { token, ready } = useAccessToken();
  const state = useApi<Issue[]>(
    async () => {
      const result = (await api.systemicIssues(token)) as Row | null;
      const items = Array.isArray(result?.items) ? (result?.items as Row[]) : [];
      return items.map((i) => ({ trigger: str(i.trigger), count: num(i.count) ?? 0 }));
    },
    { enabled: ready, key: token },
  );

  return (
    <AppPage>
      <PageHeader
        eyebrow="Marking"
        title="Systemic marking issues"
        description="Exceptions grouped by trigger over the last 30 days. A rising count points to a mark-scheme or prompt problem, not a one-off."
        actions={
          <>
            <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
              Refresh
            </Button>
            <ButtonLink href="/staff/marking/exceptions" icon={<ArrowRight size={18} />}>
              Open exceptions queue
            </ButtonLink>
          </>
        }
      />
      <DataState
        state={state}
        forbiddenBody="Systemic issues are for marking operations, content admins and the product owner."
        errorTitle="Could not load systemic issues"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No exceptions in the last 30 days"
        emptyBody="Nothing systemic to investigate right now."
      >
        {(items) => {
          const total = items.reduce((s, i) => s + i.count, 0);
          const top = [...items].sort((a, b) => b.count - a.count)[0];
          const share = top && total ? top.count / total : 0;
          return (
            <>
              <StatRow cols={3}>
                <StatTile label="Exceptions (30 days)" value={int(total)} />
                <StatTile label="Top trigger" value={top ? humanise(top.trigger) : "—"} hint={top ? `${int(top.count)} exceptions` : undefined} />
                <StatTile label="Top trigger share" value={`${Math.round(share * 100)}%`} />
              </StatRow>
              {share >= 0.5 && top && (
                <Callout tone="warning" title={`${humanise(top.trigger)} accounts for most exceptions`} className="mb-4">
                  {TRIGGER_HELP[top.trigger] ?? "Investigate the questions behind this trigger."}
                </Callout>
              )}
              <Table>
                <thead>
                  <tr>
                    <Th>Trigger</Th>
                    <Th className="text-right">Exceptions</Th>
                    <Th className="w-1/3">Share</Th>
                    <Th className="hidden md:table-cell">What it usually means</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.trigger}>
                      <Td className="font-semibold">{humanise(i.trigger)}</Td>
                      <Td className="text-right tabular">{int(i.count)}</Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Meter
                            value={total ? i.count / total : 0}
                            tone={i.trigger === "SCHEMA_FAILURE" ? "danger" : "brand"}
                            label={`${humanise(i.trigger)} share`}
                          />
                          <span className="w-10 shrink-0 text-right text-caption tabular text-neutral-600">
                            {total ? Math.round((i.count / total) * 100) : 0}%
                          </span>
                        </div>
                      </Td>
                      <Td className="hidden text-[14px] text-neutral-700 md:table-cell">{TRIGGER_HELP[i.trigger] ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
