"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { kcsieConfirm, kcsiePack } from "@/lib/api/w2";
const SCHOOL = "a1000000-0000-4000-8000-000000000001";
export default function KcsiePage() {
  const [pack, setPack] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { kcsiePack(SCHOOL).then(setPack).catch(() => setError("Could not load KCSIE pack")); }, []);
  return (
    <div>
      <AppNav displayName="School admin" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">KCSIE confirmation</h1>
        {!pack && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {pack && (
          <>
            <p className="mt-4">Pack {pack.packVersion}</p>
            <ul className="mt-4 list-disc pl-5">{(pack.sections ?? []).map((s: string) => <li key={s}>{s}</li>)}</ul>
            <button type="button" className="mt-6 rounded bg-accent px-4 py-2 text-white" onClick={() => kcsieConfirm(SCHOOL, { packVersion: pack.packVersion, answers: { filtering: true } }).then((r) => setMsg(r.status))}>Confirm alignment</button>
            {msg && <p className="mt-3" role="status">{msg}</p>}
          </>
        )}
      </main>
    </div>
  );
}
