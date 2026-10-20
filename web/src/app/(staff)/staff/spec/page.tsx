"use client";

import { useRef, useState } from "react";
import { ChartBar } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Field, Input, PageHeader, Select, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, FilterBar, StatRow, StatusBadge, toProblem, useApi, type Problem } from "@/components/staff/ops";
import { int, num, str, type Row } from "@/components/staff/format";
import { getSpecTree, listSpecs } from "@/lib/api/staff";

/** M-01 — Specification topic tree (content admin). */
export default function SpecTreePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tree, setTree] = useState<Row[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeProblem, setTreeProblem] = useState<Problem | null>(null);
  const [q, setQ] = useState("");
  const [tagging, setTagging] = useState("");

  const latest = useRef<string | null>(null);

  async function loadTree(id: string) {
    latest.current = id;
    setSelected(id);
    setTreeLoading(true);
    setTreeProblem(null);
    try {
      const t = await getSpecTree(id);
      if (latest.current === id) setTree(t.topics);
    } catch (err) {
      if (latest.current === id) setTreeProblem(toProblem(err, "Tree failed"));
    } finally {
      if (latest.current === id) setTreeLoading(false);
    }
  }

  const specs = useApi<Row[]>(async () => {
    const r = await listSpecs();
    const first = r.items[0];
    if (first) void loadTree(String(first.specificationId));
    return r.items;
  });

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Specification topics"
        description="Browse each specification's topic tree and see where tagging is done."
        actions={
          <ButtonLink href="/staff/spec/tagging" variant="secondary" icon={<ChartBar size={18} />}>
            Tagging progress
          </ButtonLink>
        }
      />
      <DataState
        state={specs}
        forbiddenBody="Specifications are managed by content admins."
        errorTitle="Could not load specifications"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No specifications"
        emptyBody="Create a specification to start building its topic tree."
      >
        {(items) => {
          const topics = tree ?? [];
          const counts = {
            done: topics.filter((t) => str(t.taggingStatus, "") === "DONE").length,
            progress: topics.filter((t) => str(t.taggingStatus, "") === "IN_PROGRESS").length,
          };
          const needle = q.trim().toLowerCase();
          const rows = topics.filter(
            (t) =>
              (!tagging || str(t.taggingStatus, "") === tagging) &&
              (!needle || `${str(t.topicNumber, "")} ${str(t.title, "")}`.toLowerCase().includes(needle)),
          );
          return (
            <>
              <FilterBar>
                <Field label="Specification" htmlFor="spec" className="w-full sm:w-80">
                  <Select id="spec" value={selected ?? ""} onChange={(e) => void loadTree(e.target.value)}>
                    {items.map((s) => (
                      <option key={String(s.specificationId)} value={String(s.specificationId)}>
                        {String(s.specCode)} — {String(s.title)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Search topics" htmlFor="t-q" className="w-full sm:w-56">
                  <Input id="t-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number or title" />
                </Field>
                <Field label="Tagging" htmlFor="t-tag" className="w-full sm:w-40">
                  <Select id="t-tag" value={tagging} onChange={(e) => setTagging(e.target.value)}>
                    <option value="">All</option>
                    <option value="DONE">Done</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="TODO">To do</option>
                  </Select>
                </Field>
              </FilterBar>

              {treeProblem?.forbidden ? (
                <Callout tone="warning">Your role cannot view this topic tree.</Callout>
              ) : treeProblem ? (
                <Callout tone="danger" title="Could not load the topic tree">
                  {treeProblem.message}
                </Callout>
              ) : treeLoading && !tree ? (
                <LoadingState label="Loading topics…" />
              ) : topics.length === 0 ? (
                <EmptyState title="No topics" body="Import a spec document to seed topics." />
              ) : (
                <>
                  <StatRow cols={3}>
                    <StatTile label="Topics" value={int(topics.length)} />
                    <StatTile label="Tagging done" value={int(counts.done)} hint={`${Math.round((counts.done / topics.length) * 100)}%`} />
                    <StatTile label="In progress" value={int(counts.progress)} />
                  </StatRow>
                  {rows.length === 0 ? (
                    <EmptyState title="No matching topics" body="Clear the search or tagging filter." />
                  ) : (
                    <Table className={treeLoading ? "opacity-60" : undefined}>
                      <thead>
                        <tr>
                          <Th>Number</Th>
                          <Th>Topic</Th>
                          <Th className="text-right">Level</Th>
                          <Th>Tagging</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t) => {
                          const level = Math.max(1, num(t.topicLevel) ?? 1);
                          return (
                            <tr key={String(t.topicId)}>
                              <Td className="whitespace-nowrap font-mono text-[13px]">{str(t.topicNumber)}</Td>
                              <Td>
                                <span
                                  className={level === 1 ? "font-semibold" : "text-neutral-800"}
                                  style={{ paddingLeft: `${(level - 1) * 16}px` }}
                                >
                                  {str(t.title)}
                                </span>
                              </Td>
                              <Td className="text-right tabular">L{level}</Td>
                              <Td>
                                <StatusBadge status={t.taggingStatus} />
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
