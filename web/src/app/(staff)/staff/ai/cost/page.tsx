"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, CurrencyGbp, Lightning, Robot } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, Field, PageHeader, Select, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { DataState, FilterBar, Meter, SectionTitle, StatRow, useApi } from "@/components/staff/ops";
import { fmtDate, gbp, int, num, str, type Row } from "@/components/staff/format";
import { aiCost } from "@/lib/api/w2";

type Usage = {
  day: string;
  taskKey: string;
  vendor: string;
  model: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costPence: number;
};
type CostData = { usage: Usage[]; budgets: Row[]; totalCostPence: number };
type GroupBy = "none" | "day" | "taskKey" | "model";

function toUsage(r: Row): Usage {
  return {
    day: str(r.day, ""),
    taskKey: str(r.taskKey),
    vendor: str(r.vendor),
    model: str(r.model),
    calls: num(r.calls) ?? 0,
    tokensIn: num(r.tokensIn) ?? 0,
    tokensOut: num(r.tokensOut) ?? 0,
    costPence: num(r.costPence) ?? 0,
  };
}

/** AIO-30 — AI cost and usage (owner). */
export default function AiCostPage() {
  const state = useApi<CostData>(async () => {
    const r = ((await aiCost()) ?? {}) as Row;
    const usage = Array.isArray(r.usage) ? (r.usage as Row[]).map(toUsage) : [];
    return {
      usage,
      budgets: Array.isArray(r.budgets) ? (r.budgets as Row[]) : [],
      totalCostPence: num(r.totalCostPence) ?? usage.reduce((s, u) => s + u.costPence, 0),
    };
  });
  const [task, setTask] = useState("");
  const [model, setModel] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const options = useMemo(() => {
    const u = state.data?.usage ?? [];
    return {
      tasks: Array.from(new Set(u.map((x) => x.taskKey))).sort(),
      models: Array.from(new Set(u.map((x) => x.model))).sort(),
    };
  }, [state.data]);

  return (
    <AppPage>
      <PageHeader
        eyebrow="AI operations"
        title="AI cost and usage"
        description="Gateway spend by day, task and model. Costs are recorded in pence and shown in pounds."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <DataState
        state={state}
        forbiddenBody="AI cost is visible to the product owner only. Ask an owner if you need these figures."
        errorTitle="Could not load AI cost"
      >
        {(d) => {
          const filtered = d.usage.filter((u) => (!task || u.taskKey === task) && (!model || u.model === model));
          const totals = filtered.reduce(
            (s, u) => ({
              calls: s.calls + u.calls,
              tokensIn: s.tokensIn + u.tokensIn,
              tokensOut: s.tokensOut + u.tokensOut,
              cost: s.cost + u.costPence,
            }),
            { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 },
          );
          const isFiltered = !!task || !!model;
          const rows = groupBy === "none" ? filtered : group(filtered, groupBy);
          const maxCost = rows.reduce((m, r) => Math.max(m, r.costPence), 0);
          return (
            <>
              <StatRow>
                <StatTile
                  label={isFiltered ? "Cost (filtered)" : "Total cost"}
                  value={gbp(isFiltered ? totals.cost : d.totalCostPence)}
                  icon={<CurrencyGbp size={20} />}
                  hint={isFiltered ? `of ${gbp(d.totalCostPence)} overall` : undefined}
                />
                <StatTile label="Calls" value={int(totals.calls)} icon={<Robot size={20} />} />
                <StatTile label="Tokens in" value={int(totals.tokensIn)} icon={<Lightning size={20} />} />
                <StatTile
                  label="Tokens out"
                  value={int(totals.tokensOut)}
                  hint={totals.calls ? `${gbp(totals.cost / totals.calls)} per call` : undefined}
                />
              </StatRow>

              <FilterBar>
                <Field label="Task" htmlFor="f-task" className="w-full sm:w-56">
                  <Select id="f-task" value={task} onChange={(e) => setTask(e.target.value)}>
                    <option value="">All tasks</option>
                    {options.tasks.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Model" htmlFor="f-model" className="w-full sm:w-56">
                  <Select id="f-model" value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="">All models</option>
                    {options.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Group by" htmlFor="f-group" className="w-full sm:w-44">
                  <Select id="f-group" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                    <option value="none">No grouping</option>
                    <option value="day">Day</option>
                    <option value="taskKey">Task</option>
                    <option value="model">Model</option>
                  </Select>
                </Field>
              </FilterBar>

              {rows.length === 0 ? (
                <EmptyState
                  title={d.usage.length === 0 ? "No AI usage recorded" : "No usage matches these filters"}
                  body={d.usage.length === 0 ? "Usage appears after the AI gateway handles its first calls." : "Choose another task or model."}
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      {(groupBy === "none" || groupBy === "day") && <Th>Day</Th>}
                      {(groupBy === "none" || groupBy === "taskKey") && <Th>Task</Th>}
                      {(groupBy === "none" || groupBy === "model") && <Th>Model</Th>}
                      <Th className="text-right">Calls</Th>
                      <Th className="text-right">Tokens in</Th>
                      <Th className="text-right">Tokens out</Th>
                      <Th className="text-right">Cost</Th>
                      <Th className="hidden w-32 md:table-cell">
                        <span className="sr-only">Share</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u, i) => (
                      <tr key={`${u.day}-${u.taskKey}-${u.model}-${i}`}>
                        {(groupBy === "none" || groupBy === "day") && (
                          <Td className="whitespace-nowrap tabular">{fmtDate(u.day)}</Td>
                        )}
                        {(groupBy === "none" || groupBy === "taskKey") && <Td className="font-mono text-[13px]">{u.taskKey}</Td>}
                        {(groupBy === "none" || groupBy === "model") && (
                          <Td>
                            <span className="block">{u.model}</span>
                            {groupBy === "none" && <span className="text-caption text-neutral-600">{u.vendor}</span>}
                          </Td>
                        )}
                        <Td className="text-right tabular">{int(u.calls)}</Td>
                        <Td className="text-right tabular">{int(u.tokensIn)}</Td>
                        <Td className="text-right tabular">{int(u.tokensOut)}</Td>
                        <Td className="text-right font-semibold tabular">{gbp(u.costPence)}</Td>
                        <Td className="hidden md:table-cell">
                          <Meter value={maxCost ? u.costPence / maxCost : 0} label="Share of highest cost row" />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}

              <SectionTitle title="Budgets" description="Spend limits and alert thresholds set by the owner." />
              {d.budgets.length === 0 ? (
                <EmptyState title="No budgets set" body="Budgets are configured through the AI budgets endpoint." />
              ) : (
                <Card>
                  <CardHeader title={`${d.budgets.length} ${d.budgets.length === 1 ? "budget" : "budgets"}`} />
                  <CardBody className="p-0">
                    <Table className="rounded-none border-0">
                      <thead>
                        <tr>
                          <Th>Period</Th>
                          <Th>Task</Th>
                          <Th>Metric</Th>
                          <Th className="text-right">Budget</Th>
                          <Th className="text-right">Alert at</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.budgets.map((b, i) => {
                          const metric = str(b.metric, "");
                          const isPence = /pence|cost/i.test(metric);
                          return (
                            <tr key={str(b.budgetId, String(i))}>
                              <Td className="tabular">{str(b.period)}</Td>
                              <Td className="font-mono text-[13px]">{str(b.taskKey, "All tasks")}</Td>
                              <Td>{str(b.metric)}</Td>
                              <Td className="text-right tabular">{isPence ? gbp(b.budgetValue) : int(b.budgetValue)}</Td>
                              <Td className="text-right tabular">{b.alertAtPct == null ? "—" : `${int(b.alertAtPct)}%`}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}

function group(rows: Usage[], by: Exclude<GroupBy, "none">): Usage[] {
  const map = new Map<string, Usage>();
  for (const u of rows) {
    const k = u[by];
    const g = map.get(k) ?? { ...u, calls: 0, tokensIn: 0, tokensOut: 0, costPence: 0 };
    g.calls += u.calls;
    g.tokensIn += u.tokensIn;
    g.tokensOut += u.tokensOut;
    g.costPence += u.costPence;
    map.set(k, g);
  }
  const out = Array.from(map.values());
  return by === "day" ? out.sort((a, b) => b.day.localeCompare(a.day)) : out.sort((a, b) => b.costPence - a.costPence);
}
