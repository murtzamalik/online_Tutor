"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { safetyFlags } from "@/lib/api/w2";

export default function Page() {

  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { safetyFlags().then((r) => setItems(r.items)).catch(() => setError("Could not load")); }, []);

  return (
    <div>
      <AppNav displayName="Staff" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">AI safety flags</h1>

        {!items && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        <ul className="mt-8 space-y-2">{items?.map((it, i) => <li key={i} className="rounded border p-3 text-sm font-mono">{JSON.stringify(it).slice(0, 180)}</li>)}</ul>

      </main>
    </div>
  );
}
