"use client";

import { useState } from "react";
import { CheckCircle, ShieldWarning, Timer, XCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Callout, Field, PageHeader, Select, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, FilterBar, SectionTitle, StatRow, StatusBadge, useApi } from "@/components/staff/ops";
import { fmtDate, fmtDateTime, humanise, int, isRecord, num, parseJson, str, type Row } from "@/components/staff/format";
import { ApiError } from "@/lib/api/client";
import { boundaryAttestation, gatewayLog } from "@/lib/api/staff";

type Attestations = { items: Row[]; forbidden: boolean };

/** Q-02 — AI data boundary: gateway log and daily attestations (no learner PII). */
export default function BoundaryPage() {
  const logs = useApi<Row[]>(async () => (await gatewayLog()).items);
  // Attestations are compliance-only; an AI engineer still sees the gateway log.
  const attest = useApi<Attestations>(
    async () => {
      try {
        return { items: (await boundaryAttestation()).items, forbidden: false };
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return { items: [], forbidden: true };
        throw err;
      }
    },
    { enabled: !logs.problem?.forbidden },
  );
  const [boundary, setBoundary] = useState<"all" | "ok" | "breach">("all");
  const [task, setTask] = useState("");

  return (
    <AppPage>
      <PageHeader
        eyebrow="AI operations"
        title="AI data boundary"
        description="Every gateway call is checked for learner PII before it leaves the platform. Payloads are hashed, never stored."
      />
      <DataState
        state={logs}
        forbiddenBody="The gateway log is for compliance and AI engineers."
        errorTitle="Could not load the gateway log"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No gateway calls yet"
        emptyBody="Log entries appear after the first AI calls."
      >
        {(items) => {
          const breaches = items.filter((l) => l.boundaryOk === false).length;
          const redactions = items.reduce((s, l) => s + (num(l.redactionCount) ?? 0), 0);
          const lat = items.map((l) => num(l.latencyMs)).filter((n): n is number => n !== null);
          const avgLatency = lat.length ? Math.round(lat.reduce((s, n) => s + n, 0) / lat.length) : null;
          const tasks = Array.from(new Set(items.map((l) => str(l.taskKey)))).sort();
          const rows = items.filter(
            (l) =>
              (boundary === "all" || (boundary === "ok" ? l.boundaryOk !== false : l.boundaryOk === false)) &&
              (!task || str(l.taskKey) === task),
          );
          return (
            <>
              <StatRow>
                <StatTile label="Gateway calls" value={int(items.length)} hint="Most recent entries" />
                <StatTile
                  label="Boundary breaches"
                  value={int(breaches)}
                  icon={breaches ? <ShieldWarning size={20} /> : <CheckCircle size={20} />}
                  hint={breaches ? "Investigate immediately" : "All calls within boundary"}
                />
                <StatTile label="Redactions" value={int(redactions)} />
                <StatTile label="Average latency" value={avgLatency === null ? "—" : `${int(avgLatency)} ms`} icon={<Timer size={20} />} />
              </StatRow>
              {breaches > 0 && (
                <Callout tone="danger" title={`${breaches} ${breaches === 1 ? "call" : "calls"} crossed the data boundary`} className="mb-4">
                  Filter by &ldquo;Breaches&rdquo; below and raise each one with compliance.
                </Callout>
              )}
              <FilterBar>
                <Field label="Boundary" htmlFor="b-filter" className="w-full sm:w-44">
                  <Select id="b-filter" value={boundary} onChange={(e) => setBoundary(e.target.value as "all" | "ok" | "breach")}>
                    <option value="all">All calls</option>
                    <option value="ok">Within boundary</option>
                    <option value="breach">Breaches</option>
                  </Select>
                </Field>
                <Field label="Task" htmlFor="b-task" className="w-full sm:w-56">
                  <Select id="b-task" value={task} onChange={(e) => setTask(e.target.value)}>
                    <option value="">All tasks</option>
                    {tasks.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FilterBar>
              {rows.length === 0 ? (
                <EmptyState title="No calls match" body="Choose another filter." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Time</Th>
                      <Th>Task</Th>
                      <Th className="hidden md:table-cell">Prompt</Th>
                      <Th>Model</Th>
                      <Th>Status</Th>
                      <Th>Boundary</Th>
                      <Th className="text-right">Redactions</Th>
                      <Th className="text-right">Latency</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={str(l.logId)}>
                        <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDateTime(l.createdAt)}</Td>
                        <Td className="font-mono text-[13px]">{str(l.taskKey)}</Td>
                        <Td className="hidden md:table-cell">
                          {str(l.promptId)} <span className="text-caption text-neutral-600">v{str(l.promptVersion)}</span>
                        </Td>
                        <Td>
                          <span className="block">{str(l.model)}</span>
                          <span className="text-caption text-neutral-600">
                            {str(l.vendor)} · {humanise(l.route)}
                          </span>
                        </Td>
                        <Td>
                          <StatusBadge status={l.status} />
                        </Td>
                        <Td>
                          {l.boundaryOk === false ? (
                            <Badge tone="danger">
                              <XCircle size={14} /> Breach
                            </Badge>
                          ) : (
                            <Badge tone="success">
                              <CheckCircle size={14} /> OK
                            </Badge>
                          )}
                        </Td>
                        <Td className="text-right tabular">{int(l.redactionCount, "0")}</Td>
                        <Td className="text-right tabular">{l.latencyMs == null ? "—" : `${int(l.latencyMs)} ms`}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          );
        }}
      </DataState>

      {!logs.problem?.forbidden && (
        <>
          <SectionTitle title="Daily attestations" description="Automated boundary checks run once a day." />
          {attest.problem && !attest.data ? (
            <Callout tone="danger" title="Could not load attestations">
              {attest.problem.message}
            </Callout>
          ) : !attest.data ? (
            <LoadingState label="Loading attestations…" />
          ) : attest.data.forbidden ? (
            <Callout tone="neutral" title="Compliance only">
              Daily attestations are visible to the compliance team.
            </Callout>
          ) : attest.data.items.length === 0 ? (
            <EmptyState title="No attestations yet" body="The first attestation is recorded after the daily boundary job runs." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Day</Th>
                  <Th>Result</Th>
                  <Th>Checks</Th>
                  <Th>Recorded</Th>
                </tr>
              </thead>
              <tbody>
                {attest.data.items.map((a) => {
                  const checks = parseJson(a.checksJson);
                  const entries = isRecord(checks) ? Object.entries(checks) : [];
                  return (
                    <tr key={str(a.attestationId)}>
                      <Td className="whitespace-nowrap tabular">{fmtDate(a.day)}</Td>
                      <Td>{a.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="danger">Failed</Badge>}</Td>
                      <Td>
                        {entries.length === 0 ? (
                          <span className="text-neutral-600">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {entries.map(([k, v]) => (
                              <Badge key={k} tone={v === false ? "danger" : v === true ? "success" : "neutral"}>
                                {humanise(k)}
                                {typeof v === "number" ? `: ${v}` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDateTime(a.createdAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </>
      )}
    </AppPage>
  );
}
