"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { aiCost } from "@/lib/api/w2";

export default function Page() {

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { aiCost().then(setData).catch(() => setError("Could not load AI cost")); }, []);

  return (
    <div>
      <AppNav displayName="Staff" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">AI cost & usage</h1>

        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && <p className="mt-8">Total cost (pence): {data.totalCostPence}</p>}

      </main>
    </div>
  );
}
