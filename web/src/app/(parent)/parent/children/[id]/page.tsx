"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getActionPlan, getAlerts } from "@/lib/api/w2";

export default function ParentProgressPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([getActionPlan(id), getAlerts(id)])
      .then(([p, a]) => { setPlan(p); setAlerts(a.items); })
      .catch(() => setError("Could not load progress"));
  }, [id]);
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Progress</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="underline" href={`/parent/children/${id}/controls`}>Controls</Link>
          <Link className="underline" href={`/parent/children/${id}/privacy`}>Privacy</Link>
          <Link className="underline" href={`/parent/children/${id}/consent`}>Under-13 consent</Link>
        </div>
        {!plan && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {plan && (
          <div className="mt-8 space-y-4">
            <h2 className="font-display text-2xl">Action plan</h2>
            <ul className="list-disc pl-5">{(plan.actions ?? []).map((a: string) => <li key={a}>{a}</li>)}</ul>
            <h2 className="font-display text-2xl">Alerts</h2>
            <ul className="space-y-2">{alerts.map((a) => <li key={a.alertId} className="rounded border border-mist p-3">{a.message}</li>)}</ul>
          </div>
        )}
      </main>
    </div>
  );
}
