"use client";

import { ListChecks } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { DataState, StatRow, useApi } from "@/components/staff/ops";
import { int, num, str, type Row } from "@/components/staff/format";
import { taggingProgress } from "@/lib/api/staff";

/** M-04 — Spec-point tagging progress per specification (content admin). */
export default function TaggingProgressPage() {
  const state = useApi<Row[]>(async () => (await taggingProgress()).items);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Tagging progress"
        description="How many spec points are tagged in each specification. Generation only targets tagged topics."
        actions={
          <ButtonLink href="/staff/spec" variant="secondary" icon={<ListChecks size={18} />}>
            Topic trees
          </ButtonLink>
        }
      />
      <DataState
        state={state}
        forbiddenBody="Tagging progress is for content admins."
        errorTitle="Could not load tagging progress"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No specifications"
        emptyBody="The catalogue is empty."
      >
        {(items) => {
          const rows = items.map((r) => {
            const done = num(r.doneCount) ?? 0;
            const prog = num(r.inProgressCount) ?? 0;
            const todo = num(r.todoCount) ?? 0;
            const total = num(r.totalTopics) ?? done + prog + todo;
            return { id: str(r.specificationId), code: str(r.specCode), title: str(r.title), done, prog, todo, total };
          });
          const sum = rows.reduce(
            (s, r) => ({ done: s.done + r.done, prog: s.prog + r.prog, todo: s.todo + r.todo, total: s.total + r.total }),
            { done: 0, prog: 0, todo: 0, total: 0 },
          );
          return (
            <>
              <StatRow>
                <StatTile label="Spec points" value={int(sum.total)} hint={`${rows.length} specifications`} />
                <StatTile label="Done" value={int(sum.done)} hint={sum.total ? `${Math.round((sum.done / sum.total) * 100)}% overall` : undefined} />
                <StatTile label="In progress" value={int(sum.prog)} />
                <StatTile label="To do" value={int(sum.todo)} />
              </StatRow>
              <Table>
                <thead>
                  <tr>
                    <Th>Specification</Th>
                    <Th className="w-[34%]">Progress</Th>
                    <Th className="text-right">Done</Th>
                    <Th className="text-right">In progress</Th>
                    <Th className="text-right">To do</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pDone = r.total ? r.done / r.total : 0;
                    const pProg = r.total ? r.prog / r.total : 0;
                    return (
                      <tr key={r.id}>
                        <Td>
                          <span className="block font-semibold">{r.code}</span>
                          <span className="text-caption text-neutral-600">{r.title}</span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100"
                              role="meter"
                              aria-label={`${r.code} tagging done`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(pDone * 100)}
                            >
                              <div className="h-full bg-answer-correct" style={{ width: `${pDone * 100}%` }} />
                              <div className="h-full bg-answer-partial" style={{ width: `${pProg * 100}%` }} />
                            </div>
                            <span className="w-10 shrink-0 text-right text-caption tabular text-neutral-600">{Math.round(pDone * 100)}%</span>
                          </div>
                        </Td>
                        <Td className="text-right tabular">{int(r.done)}</Td>
                        <Td className="text-right tabular">{int(r.prog)}</Td>
                        <Td className="text-right tabular">{int(r.todo)}</Td>
                        <Td className="text-right font-semibold tabular">{int(r.total)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <p className="mt-2 flex flex-wrap gap-4 text-caption text-neutral-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-answer-correct" /> Done
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-answer-partial" /> In progress
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-100 ring-1 ring-neutral-200" /> To do
                </span>
              </p>
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
