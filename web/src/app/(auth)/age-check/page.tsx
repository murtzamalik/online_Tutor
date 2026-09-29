"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ageStatus, completeAge, startAge } from "@/lib/api/w2";

/** L-05 */
export default function AgeCheckPage() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { ageStatus().then(setStatus).catch(() => setError("Could not load age status")); }, []);
  async function run() {
    const s = await startAge();
    await completeAge(s.recordId, true);
    setStatus(await ageStatus());
  }
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Age assurance</h1>
        {!status && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {status && <p className="mt-6">Outcome: {status.outcome}</p>}
        <button type="button" className="mt-4 rounded bg-accent px-4 py-2 text-white" onClick={() => run().catch((e) => setError(String(e.message || e)))}>Complete self-declared check</button>
      </main>
    </div>
  );
}
