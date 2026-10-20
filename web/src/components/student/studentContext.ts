import { getMe, MeSchema } from "@/lib/api/auth";
import { listEnrolments, listStudents, studentHome, dailyGoal } from "@/lib/api/students";
import { startPractice } from "@/lib/api/practice";
import { homePathForRoles } from "@/lib/auth/post-login";
import type { z } from "zod";

export type Me = z.infer<typeof MeSchema>;

export type StudentContext = {
  me: Me;
  /** Set when the signed-in account is a parent/staff without a student role: caller should navigate here. */
  redirectTo: string | null;
  studentId: string | null;
  enrolmentId: string | null;
  home: Record<string, unknown> | null;
  goal: { answered: number; target: number } | null;
};

/**
 * Shell-01 student bootstrap, shared by Home and the Practice hub: resolves the student and the active
 * enrolment (storing both in sessionStorage as `studentId` / `enrolmentId`), the home payload and today's goal.
 */
export async function loadStudentContext(token: string): Promise<StudentContext> {
  const profile = await getMe(token);

  const staffOrParent =
    profile.kind === "STAFF" ||
    profile.kind === "PARENT" ||
    profile.roles.some((r) => ["PARENT", "PAR", "REVIEWER", "REV", "CNT", "OPS", "STAFF"].includes(r));
  const isStudent = profile.kind === "STUDENT" || profile.roles.includes("STU") || profile.roles.includes("STUDENT");

  if (staffOrParent && !isStudent) {
    return { me: profile, redirectTo: homePathForRoles(profile.roles, profile.kind), studentId: null, enrolmentId: null, home: null, goal: null };
  }

  let sid: string | null = profile.studentId ?? sessionStorage.getItem("studentId");
  let eid: string | null = sessionStorage.getItem("enrolmentId");
  let home: Record<string, unknown> | null = null;
  let goal: StudentContext["goal"] = null;

  if (!sid && profile.roles.includes("PARENT")) {
    const kids = await listStudents();
    sid = kids.items[0]?.studentId ?? null;
    const enr = kids.items[0]?.enrolments as { enrolmentId?: string }[] | undefined;
    eid = enr?.[0]?.enrolmentId ?? eid;
  }

  if (sid) {
    sessionStorage.setItem("studentId", sid);
    try {
      const h = await studentHome(sid);
      home = h;
      const cont = h.continueSession as { enrolmentId?: string } | undefined;
      if (cont?.enrolmentId) eid = cont.enrolmentId;
      if (typeof h.activeEnrolmentId === "string") eid = h.activeEnrolmentId;
    } catch {
      /* home optional */
    }
    if (!eid) {
      try {
        const ens = await listEnrolments(sid);
        eid = ens.items[0]?.enrolmentId ?? null;
      } catch {
        /* optional */
      }
    }
    try {
      const g = await dailyGoal(sid);
      goal = { answered: g.answered, target: g.target };
    } catch {
      /* optional */
    }
  }

  if (eid) sessionStorage.setItem("enrolmentId", eid);

  return { me: profile, redirectTo: null, studentId: sid, enrolmentId: eid, home, goal };
}

/** The Home "Start practice" action: a 5-question mixed session, then straight into it. */
export async function startMixedPractice(enrolmentId: string): Promise<void> {
  const s = await startPractice({ enrolmentId, mode: "MIXED", plannedCount: 5 });
  window.location.href = `/practice/${s.sessionId}`;
}

export const START_PRACTICE_FALLBACK_ERROR = "Could not start practice. Use child login if you are a parent.";
