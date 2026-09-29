"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { schoolDashboard } from "@/lib/api/w2";
const SCHOOL = "a1000000-0000-4000-8000-000000000001";
export default function SchoolDashboardPage() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { schoolDashboard(SCHOOL).then(setD).catch(() => setError("Could not load dashboard")); }, []);
  return (
    <div>
      <AppNav displayName="School admin" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">School dashboard</h1>
        {!d && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {d && <p className="mt-8">Classes {d.classCount} · Pupils {d.pupilCount}</p>}
      </main>
    </div>
  );
}
