"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, PlusCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Field,
  MASTERY,
  MasteryBadge,
  MasteryRing,
  PageHeader,
  Select,
  StatTile,
  Table,
  Td,
  Th,
  masteryLevel,
} from "@/components/ui/primitives";
import { DataState, FilterBar, Meter, StatRow, useApi } from "@/components/staff/ops";
import { int, num, str, type Row } from "@/components/staff/format";
import { TEACHER_FORBIDDEN } from "@/components/school/school";
import { classMastery } from "@/lib/api/w2";

type Cell = { topicId: string; name: string; avg: number; pupils: number };

/** INS-01 — Class insights: mastery by topic. */
export default function InsightsPage() {
  const { classId } = useParams<{ classId: string }>();
  const state = useApi<Cell[]>(
    async () => {
      const r = (await classMastery(classId)) as Row | null;
      const heat = Array.isArray(r?.heatmap) ? (r?.heatmap as Row[]) : [];
      return heat.map((c) => ({
        topicId: String(c.topicId),
        name: [str(c.topicNumber, ""), str(c.topicName, "")].filter(Boolean).join(" ") || `Topic ${String(c.topicId)}`,
        avg: num(c.avgMastery) ?? 0,
        pupils: num(c.pupils) ?? 0,
      }));
    },
    { key: classId },
  );
  const [band, setBand] = useState<string>("all");
  const [sort, setSort] = useState<"low" | "high" | "pupils">("low");

  const summary = useMemo(() => {
    const cells = state.data ?? [];
    const weight = cells.reduce((s, c) => s + c.pupils, 0);
    const avg = weight > 0 ? cells.reduce((s, c) => s + c.avg * c.pupils, 0) / weight : null;
    const bands = MASTERY.map((m) => cells.filter((c) => masteryLevel(c.avg) === m.level).length);
    const maxPupils = cells.reduce((m, c) => Math.max(m, c.pupils), 0);
    return { avg, bands, maxPupils };
  }, [state.data]);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Class insights"
        title="Mastery by topic"
        description="Average mastery for pupils in this class, lowest topics first."
        actions={
          <>
            <ButtonLink href="/school/classes" variant="tertiary" icon={<ArrowLeft size={18} />}>
              Classes
            </ButtonLink>
            <ButtonLink href={`/school/classes/${classId}/assignments/new`} icon={<PlusCircle size={18} />}>
              Set assignment
            </ButtonLink>
          </>
        }
      />
      <DataState
        state={state}
        forbiddenBody={TEACHER_FORBIDDEN}
        errorTitle="Could not load insights"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No mastery data yet"
        emptyBody="Mastery fills in as pupils in this class practise. Set an assignment to get started."
        emptyAction={
          <ButtonLink href={`/school/classes/${classId}/assignments/new`} size="sm">
            Set assignment
          </ButtonLink>
        }
      >
        {(cells) => {
          const rows = cells
            .filter((c) => band === "all" || String(masteryLevel(c.avg)) === band)
            .sort((a, b) => (sort === "low" ? a.avg - b.avg : sort === "high" ? b.avg - a.avg : b.pupils - a.pupils));
          const focus = [...cells].sort((a, b) => a.avg - b.avg).slice(0, 3);
          return (
            <>
              <StatRow>
                <StatTile
                  label="Class mastery"
                  value={summary.avg === null ? "—" : `${Math.round(summary.avg * 100)}%`}
                  hint={summary.avg === null ? undefined : MASTERY[masteryLevel(summary.avg)].label}
                />
                <StatTile label="Topics tracked" value={int(cells.length)} />
                <StatTile label="Pupils with data" value={int(summary.maxPupils)} hint="Most pupils on any one topic" />
                <StatTile
                  label="Secure or mastered"
                  value={int(summary.bands[2] + summary.bands[3])}
                  hint={`of ${cells.length} topics`}
                />
              </StatRow>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <FilterBar>
                    <Field label="Mastery band" htmlFor="band" className="w-full sm:w-56">
                      <Select id="band" value={band} onChange={(e) => setBand(e.target.value)}>
                        <option value="all">All bands</option>
                        {MASTERY.map((m) => (
                          <option key={m.level} value={String(m.level)}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Sort by" htmlFor="sort" className="w-full sm:w-48">
                      <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as "low" | "high" | "pupils")}>
                        <option value="low">Lowest mastery first</option>
                        <option value="high">Highest mastery first</option>
                        <option value="pupils">Most pupils</option>
                      </Select>
                    </Field>
                  </FilterBar>
                  {rows.length === 0 ? (
                    <Callout tone="neutral">No topics in this band.</Callout>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Topic</Th>
                          <Th>Mastery</Th>
                          <Th className="hidden sm:table-cell">Band</Th>
                          <Th className="text-right">Pupils</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((c) => (
                          <tr key={c.topicId}>
                            <Td className="font-medium">{c.name}</Td>
                            <Td>
                              <div className="flex items-center gap-3">
                                <MasteryRing value={c.avg} size={36} label={c.name} />
                                <span className="sm:hidden">
                                  <MasteryBadge value={c.avg} />
                                </span>
                              </div>
                            </Td>
                            <Td className="hidden sm:table-cell">
                              <MasteryBadge value={c.avg} />
                            </Td>
                            <Td className="text-right tabular">{int(c.pupils)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader title="Band spread" description="Topics in each mastery band" />
                    <CardBody className="space-y-3">
                      {MASTERY.map((m, i) => (
                        <div key={m.level}>
                          <div className="mb-1 flex items-center justify-between text-[14px]">
                            <span className="inline-flex items-center gap-2 text-neutral-700">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                              {m.label}
                            </span>
                            <span className="tabular font-semibold">{summary.bands[i]}</span>
                          </div>
                          <Meter value={cells.length ? summary.bands[i] / cells.length : 0} label={`${m.label} topics`} />
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader title="Suggested focus" description="Lowest-mastery topics for this class" />
                    <CardBody>
                      <ul className="space-y-3">
                        {focus.map((c) => (
                          <li key={c.topicId} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-[14px] font-medium" title={c.name}>{c.name}</span>
                            <MasteryBadge value={c.avg} />
                          </li>
                        ))}
                      </ul>
                      <ButtonLink
                        href={`/school/classes/${classId}/assignments/new?topics=${focus.map((c) => c.topicId).join(",")}`}
                        variant="secondary"
                        size="sm"
                        className="mt-4 w-full"
                      >
                        Set work on these topics
                      </ButtonLink>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
