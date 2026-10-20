"use client";

import type { ReactNode } from "react";
import { ChalkboardTeacher, ClipboardText, CreditCard, ShieldCheck, Student } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, PageHeader, StatTile } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, SectionTitle, StatRow, useApi } from "@/components/staff/ops";
import { int, num, type Row } from "@/components/staff/format";
import { ClassCard, useSchoolId, SCHOOL_ADMIN_FORBIDDEN } from "@/components/school/school";
import { schoolClasses, schoolDashboard } from "@/lib/api/w2";


/** INS-04 — School dashboard (school admin). */
export default function SchoolDashboardPage() {
  const SCHOOL = useSchoolId();
  const dash = useApi<Row>(async () => (await schoolDashboard(SCHOOL)) as Row);
  const classes = useApi<Row[]>(async () => (await schoolClasses(SCHOOL)).items as Row[]);

  return (
    <AppPage>
      <PageHeader
        eyebrow="School"
        title="School dashboard"
        description="Classes, pupils and setup tasks for your school."
        actions={
          <>
            <ButtonLink href="/school/onboarding" variant="secondary" icon={<ClipboardText size={18} />}>
              Import roster
            </ButtonLink>
            <ButtonLink href="/school/classes" icon={<ChalkboardTeacher size={18} />}>
              View classes
            </ButtonLink>
          </>
        }
      />

      <DataState state={dash} forbiddenBody={SCHOOL_ADMIN_FORBIDDEN} errorTitle="Could not load the dashboard">
        {(d) => {
          const classCount = num(d.classCount) ?? 0;
          const pupilCount = num(d.pupilCount) ?? 0;
          return (
            <StatRow cols={3}>
              <StatTile label="Active classes" value={int(classCount)} icon={<ChalkboardTeacher size={20} />} />
              <StatTile label="Pupils enrolled" value={int(pupilCount)} icon={<Student size={20} />} />
              <StatTile
                label="Pupils per class"
                value={classCount > 0 ? (pupilCount / classCount).toFixed(1) : "—"}
                hint="Average across active classes"
              />
            </StatRow>
          );
        }}
      </DataState>

      <SectionTitle
        title="Classes"
        description="Open a class to see mastery by topic or set an assignment."
        action={
          <ButtonLink href="/school/classes" variant="tertiary" size="sm">
            All classes
          </ButtonLink>
        }
      />
      {classes.problem && !classes.data ? (
        <Callout tone={classes.problem.forbidden ? "warning" : "danger"} title="Classes are not available">
          {classes.problem.forbidden ? "Your role cannot list classes at this school." : classes.problem.message}
        </Callout>
      ) : !classes.data ? (
        <LoadingState label="Loading classes…" />
      ) : classes.data.length === 0 ? (
        <EmptyState
          title="No classes yet"
          body="Import your roster to create pupils, then add them to classes."
          action={
            <ButtonLink href="/school/onboarding" size="sm">
              Import roster
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.data.slice(0, 6).map((c) => (
            <ClassCard key={String(c.classId)} cls={c} />
          ))}
        </div>
      )}

      <SectionTitle title="Setup and compliance" />
      <div className="grid gap-4 sm:grid-cols-3">
        <SetupCard
          href="/school/onboarding"
          icon={<ClipboardText size={20} />}
          title="Rostering"
          body="Upload a CSV of pupil names to create accounts."
        />
        <SetupCard
          href="/school/kcsie"
          icon={<ShieldCheck size={20} />}
          title="KCSIE compliance"
          body="Review the safeguarding pack and confirm alignment."
        />
        <SetupCard
          href="/school/billing"
          icon={<CreditCard size={20} />}
          title="DPA and invoices"
          body="Sign the data processing agreement and view invoices."
        />
      </div>
    </AppPage>
  );
}

function SetupCard({ href, icon, title, body }: { href: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardBody>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 text-neutral-700">{icon}</span>
        <p className="mt-3 font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-[14px] text-neutral-600">{body}</p>
        <ButtonLink href={href} variant="tertiary" size="sm" className="-ml-3 mt-3">
          Open
        </ButtonLink>
      </CardBody>
    </Card>
  );
}
