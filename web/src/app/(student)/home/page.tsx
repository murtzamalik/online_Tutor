"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { getMe, MeSchema } from "@/lib/api/auth";
import { listStudents, studentHome, dailyGoal } from "@/lib/api/students";
import { startPractice } from "@/lib/api/practice";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/Button";
import { z } from "zod";

type Me = z.infer<typeof MeSchema>;

/** Shell-01 — Student home with real aggregates when available */
export default function StudentHomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [home, setHome] = useState<Record<string, unknown> | null>(null);
  const [goal, setGoal] = useState<{ answered: number; target: number } | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setError("Sign in to continue.");
      return;
    }
    (async () => {
      try {
        const profile = await getMe(token);
        setMe(profile);
        let sid: string | null = null;
        if (profile.roles.includes("STU")) {
          // student JWT — backend may expose student via children empty; home uses path param
          const fromStorage = sessionStorage.getItem("studentId");
          sid = fromStorage;
        }
        if (!sid && profile.roles.includes("PAR")) {
          const kids = await listStudents();
          sid = kids.items[0]?.studentId ?? null;
          const enr = kids.items[0]?.enrolments as { enrolmentId?: string }[] | undefined;
          setEnrolmentId(enr?.[0]?.enrolmentId ?? null);
        }
        if (sid) {
          setStudentId(sid);
          try {
            const h = await studentHome(sid);
            setHome(h);
            const cont = h.continueSession as { enrolmentId?: string } | undefined;
            if (cont?.enrolmentId) setEnrolmentId(cont.enrolmentId);
            if (typeof h.activeEnrolmentId === "string") setEnrolmentId(h.activeEnrolmentId);
          } catch {
            /* home optional */
          }
          try {
            const g = await dailyGoal(sid);
            setGoal({
              answered: g.progressToday?.answered ?? 0,
              target: g.progressToday?.target ?? g.targetQuestions,
            });
          } catch {
            /* optional */
          }
        }
      } catch {
        setError("Could not load your profile.");
      }
    })();
  }, []);

  return (
    <div>
      <AppNav displayName={me?.displayName} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {!me && !error && <LoadingState label="Loading your home…" />}
        {error && <ErrorState body={error} />}
        {me && (
          <div className="space-y-6 animate-rise">
            <div>
              <h1 className="font-display text-4xl">Hello, {me.displayName}</h1>
              <p className="mt-2 text-ink/70">Continue practice or review due topics.</p>
            </div>
            {goal && (
              <p className="rounded-md border border-mist bg-white/70 px-4 py-3 text-sm">
                Today&apos;s goal: {goal.answered} / {goal.target} questions
              </p>
            )}
            {home ? (
              <pre className="overflow-auto rounded-md bg-mist/30 p-3 text-xs text-ink/70">
                {JSON.stringify(home, null, 2)}
              </pre>
            ) : (
              <EmptyState
                title="Ready when you are"
                body="Enrol on a board-track, complete a diagnostic, then practise."
              />
            )}
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-md border border-mist px-4 py-2 font-semibold" href="/onboarding/subjects">
                Subjects
              </Link>
              <Link className="rounded-md border border-mist px-4 py-2 font-semibold" href="/parent">
                Parent home
              </Link>
              {enrolmentId && (
                <Button
                  onClick={async () => {
                    const s = await startPractice({ enrolmentId, mode: "MIXED", plannedCount: 5 });
                    window.location.href = `/practice/${s.sessionId}`;
                  }}
                >
                  Start practice
                </Button>
              )}
              {studentId && (
                <Link
                  className="rounded-md border border-mist px-4 py-2 font-semibold"
                  href={`/onboarding/diagnostic?studentId=${studentId}${enrolmentId ? `&enrolmentId=${enrolmentId}` : ""}`}
                >
                  Diagnostic
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
