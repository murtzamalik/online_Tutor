"use client";

import Link from "next/link";
import { ChalkboardTeacher, ChartLineUp, PlusCircle } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/primitives";
import { str, type Row } from "@/components/staff/format";
import { useSession } from "@/components/shell/session";

/** Pilot school, used only when the signed-in account has no school of its own (platform staff). */
export const PILOT_SCHOOL_ID = "a1000000-0000-4000-8000-000000000001";

/** The signed-in teacher's / school admin's school (GET /me schoolId). */
export function useSchoolId(): string {
  return useSession()?.schoolId ?? PILOT_SCHOOL_ID;
}

export const SCHOOL_ADMIN_FORBIDDEN =
  "This area is for school admins and business managers. Ask your school admin to give you access.";
export const TEACHER_FORBIDDEN = "This area is for teachers at this school. Ask your school admin to add you to the class.";

/** Class summary card used on the dashboard and classes list. */
export function ClassCard({ cls }: { cls: Row }) {
  const id = str(cls.classId, "");
  const yearGroup = str(cls.yearGroup, "");
  return (
    <Card className="flex flex-col p-5" interactive>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/school/classes/${id}/insights`}
            className="block truncate text-[16px] font-semibold text-neutral-900 hover:underline"
          >
            {str(cls.name, "Unnamed class")}
          </Link>
          <p className="mt-0.5 text-caption text-neutral-600">Academic year {str(cls.academicYear)}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
          <ChalkboardTeacher size={20} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {yearGroup ? <Badge tone="brand">Year {yearGroup}</Badge> : <Badge>No year group</Badge>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        <ButtonLink href={`/school/classes/${id}/insights`} variant="secondary" size="sm" icon={<ChartLineUp size={16} />}>
          Insights
        </ButtonLink>
        <ButtonLink href={`/school/classes/${id}/assignments/new`} variant="tertiary" size="sm" icon={<PlusCircle size={16} />}>
          New assignment
        </ButtonLink>
      </div>
    </Card>
  );
}
