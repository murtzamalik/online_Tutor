"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { listStudents, StudentSchema } from "@/lib/api/students";
import { getParentHome } from "@/lib/api/w2";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { z } from "zod";

type Student = z.infer<typeof StudentSchema>;

/** Shell-02 — Parent home basics */
export default function ParentHomePage() {
  const [items, setItems] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStudents()
      .then(async (r) => {
        setItems(r.items);
        try { await getParentHome(); } catch { /* H-10 aggregate best-effort */ }
      })
      .catch(() => setError("Could not load children. Are you signed in as a parent?"));
  }, []);

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">Your children</h1>
            <p className="mt-2 text-ink/70">Manage profiles, enrolment, and consent.</p>
          </div>
          <Link className="rounded-md bg-accent px-4 py-2 font-semibold text-white" href="/parent/children/new">
            Add child
          </Link>
        </div>
        {!items && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {items && items.length === 0 && (
          <div className="mt-8">
            <EmptyState title="No children yet" body="Add a child to start onboarding and practice." />
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="mt-8 space-y-3">
            {items.map((s) => (
              <li key={s.studentId} className="rounded-md border border-mist bg-white/70 px-4 py-4">
                <p className="font-semibold">{s.displayName}</p>
                <p className="text-sm text-ink/70">
                  {s.yearGroup ?? "—"} · {s.ageBand} · {s.status}
                  {s.requiresUnder13Consent ? " · under-13 consent needed" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link className="underline" href={`/parent/children/${s.studentId}`}>Progress</Link>
                  <Link className="underline" href="/parent/plan/subjects">Plan subjects</Link>
                  <Link className="underline" href="/parent/billing">Billing</Link>
                  <Link className="underline" href={`/onboarding/subjects?studentId=${s.studentId}`}>
                    Choose subjects
                  </Link>
                  <Link className="underline" href={`/onboarding/diagnostic?studentId=${s.studentId}`}>
                    Diagnostic
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
