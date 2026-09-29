"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getPrivacy, putPrivacy } from "@/lib/api/w2";

/** L-03 high-privacy defaults */
export default function PrivacyPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getPrivacy(id).then(setP).catch(() => setError("Could not load privacy")); }, [id]);
  if (!p && !error) return <div className="p-10"><LoadingState /></div>;
  if (error) return <div className="p-10"><ErrorState body={error} /></div>;
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Privacy settings</h1>
        <p className="mt-2 text-ink/70">Default telemetry is ESSENTIAL (high privacy).</p>
        <label className="mt-6 block">Telemetry
          <select className="mt-1 w-full rounded border p-2" value={p.telemetryLevel} onChange={(e) => putPrivacy(id, { telemetryLevel: e.target.value }).then(setP)}>
            <option value="ESSENTIAL">Essential</option>
            <option value="ENGAGEMENT">Engagement</option>
          </select>
        </label>
        <label className="mt-4 flex gap-2 items-center"><input type="checkbox" checked={!!p.teacherVisibility} onChange={(e) => putPrivacy(id, { teacherVisibility: e.target.checked }).then(setP)} /> Teacher visibility</label>
      </main>
    </div>
  );
}
