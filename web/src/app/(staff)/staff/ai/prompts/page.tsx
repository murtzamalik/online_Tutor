"use client";

import { useState } from "react";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Field, Input, PageHeader, Select, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, FilterBar, ResultNote, SectionTitle, StatRow, StatusBadge, useApi } from "@/components/staff/ops";
import { fmtDate, fmtDateTime, int, str, type Row } from "@/components/staff/format";
import { listPrompts, modelRouting } from "@/lib/api/staff";

const STATUSES = ["LIVE", "DRAFT", "EVALUATING", "RETIRED", "REJECTED"] as const;

/** Q-03 — Prompt registry and model routing (AI engineer). */
export default function PromptsPage() {
  const prompts = useApi<Row[]>(async () => (await listPrompts()).items);
  const routing = useApi<Row[]>(async () => (await modelRouting()).items, { enabled: !prompts.problem?.forbidden });
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  return (
    <AppPage>
      <PageHeader
        eyebrow="AI operations"
        title="Prompts and routing"
        description="Latest version of each registered prompt and the model each gateway task routes to."
      />
      <DataState
        state={prompts}
        forbiddenBody="The prompt registry is for AI engineers. Ask an AI engineer if you need a prompt changed."
        errorTitle="Could not load prompts"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No prompts registered"
        emptyBody="Prompt versions appear once the prompt files are seeded into the registry."
      >
        {(items) => {
          const count = (s: string) => items.filter((p) => str(p.status, "").toUpperCase() === s).length;
          const needle = q.trim().toLowerCase();
          const rows = items.filter(
            (p) =>
              (!status || str(p.status, "").toUpperCase() === status) &&
              (!needle || `${str(p.promptId, "")} ${str(p.taskKey, "")}`.toLowerCase().includes(needle)),
          );
          return (
            <>
              <StatRow>
                <StatTile label="Prompts" value={int(items.length)} />
                <StatTile label="Live" value={int(count("LIVE"))} />
                <StatTile label="Draft or evaluating" value={int(count("DRAFT") + count("EVALUATING"))} />
                <StatTile label="Retired" value={int(count("RETIRED") + count("REJECTED"))} />
              </StatRow>
              <FilterBar>
                <Field label="Search" htmlFor="p-q" className="w-full sm:w-64">
                  <Input id="p-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prompt ID or task" />
                </Field>
                <Field label="Status" htmlFor="p-status" className="w-full sm:w-44">
                  <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FilterBar>
              {rows.length === 0 ? (
                <EmptyState title="No matching prompts" body="Clear the search or choose another status." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Prompt</Th>
                      <Th>Version</Th>
                      <Th>Task</Th>
                      <Th>Status</Th>
                      <Th>Created</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={str(p.promptId)}>
                        <Td className="font-semibold">{str(p.promptId)}</Td>
                        <Td className="tabular">v{str(p.version)}</Td>
                        <Td className="font-mono text-[13px]">{str(p.taskKey)}</Td>
                        <Td>
                          <StatusBadge status={p.status} label={str(p.status).toUpperCase()} />
                        </Td>
                        <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDate(p.createdAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          );
        }}
      </DataState>

      {!prompts.problem?.forbidden && (
        <>
          <SectionTitle title="Model routing" description="Primary and fallback model per gateway task." />
          {routing.problem && !routing.data ? (
            <ResultNote
              note={{
                tone: routing.problem.forbidden ? "warning" : "danger",
                text: routing.problem.forbidden ? "Your role cannot view model routing." : routing.problem.message,
              }}
            />
          ) : !routing.data ? (
            <LoadingState label="Loading routing…" />
          ) : routing.data.length === 0 ? (
            <EmptyState title="No routes configured" body="Every gateway task needs a model route before it can run." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Task</Th>
                  <Th>Tier</Th>
                  <Th>Vendor</Th>
                  <Th>Model</Th>
                  <Th>Fallback</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {routing.data.map((r) => (
                  <tr key={str(r.taskKey)}>
                    <Td className="font-mono text-[13px]">{str(r.taskKey)}</Td>
                    <Td>
                      <Badge tone="brand">{str(r.modelTier)}</Badge>
                    </Td>
                    <Td>{str(r.vendor)}</Td>
                    <Td className="font-medium">{str(r.modelId)}</Td>
                    <Td className="text-neutral-700">{str(r.fallbackModelId)}</Td>
                    <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDateTime(r.updatedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </AppPage>
  );
}
