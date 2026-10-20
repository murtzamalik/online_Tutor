"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChartLineUp, PlusCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Field, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { DataState, FilterBar, useApi } from "@/components/staff/ops";
import { str, type Row } from "@/components/staff/format";
import { useSchoolId, TEACHER_FORBIDDEN } from "@/components/school/school";
import { schoolClasses } from "@/lib/api/w2";


/** SCH-02 — Classes list (teacher / school admin). */
export default function ClassesPage() {
  const SCHOOL = useSchoolId();
  const state = useApi<Row[]>(async () => (await schoolClasses(SCHOOL)).items as Row[]);
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");

  const years = useMemo(
    () => Array.from(new Set((state.data ?? []).map((c) => str(c.yearGroup, "")).filter(Boolean))).sort(),
    [state.data],
  );

  return (
    <AppPage>
      <PageHeader eyebrow="School" title="Classes" description="Every active class at your school. Open one to see insights or set work." />
      <DataState
        state={state}
        forbiddenBody={TEACHER_FORBIDDEN}
        errorTitle="Could not load classes"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No classes yet"
        emptyBody="Classes appear here once your school admin creates them."
      >
        {(items) => {
          const needle = q.trim().toLowerCase();
          const rows = items.filter(
            (c) => (!needle || str(c.name, "").toLowerCase().includes(needle)) && (!year || str(c.yearGroup, "") === year),
          );
          return (
            <>
              <FilterBar>
                <Field label="Search" htmlFor="class-search" className="w-full sm:w-64">
                  <Input id="class-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Class name" />
                </Field>
                <Field label="Year group" htmlFor="class-year" className="w-full sm:w-44">
                  <Select id="class-year" value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">All years</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="pb-3 text-caption text-neutral-600 tabular">
                  {rows.length} of {items.length} classes
                </p>
              </FilterBar>
              {rows.length === 0 ? (
                <EmptyState title="No matching classes" body="Clear the search or choose another year group." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Class</Th>
                      <Th>Year group</Th>
                      <Th>Academic year</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => {
                      const id = str(c.classId, "");
                      return (
                        <tr key={id}>
                          <Td>
                            <Link href={`/school/classes/${id}/insights`} className="font-semibold hover:underline">
                              {str(c.name, "Unnamed class")}
                            </Link>
                          </Td>
                          <Td>{str(c.yearGroup, "") ? <Badge tone="brand">Year {str(c.yearGroup)}</Badge> : "—"}</Td>
                          <Td className="tabular">{str(c.academicYear)}</Td>
                          <Td className="text-right">
                            <div className="flex justify-end gap-2">
                              <ButtonLink
                                href={`/school/classes/${id}/insights`}
                                variant="secondary"
                                size="sm"
                                icon={<ChartLineUp size={16} />}
                              >
                                Insights
                              </ButtonLink>
                              <ButtonLink
                                href={`/school/classes/${id}/assignments/new`}
                                variant="tertiary"
                                size="sm"
                                icon={<PlusCircle size={16} />}
                              >
                                New assignment
                              </ButtonLink>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
