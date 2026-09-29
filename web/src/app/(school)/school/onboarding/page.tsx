"use client";
import { useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState } from "@/components/ui/states";
import { rosterImport } from "@/lib/api/w2";
const SCHOOL = "a1000000-0000-4000-8000-000000000001";
export default function SchoolOnboardingPage() {
  const [csv, setCsv] = useState("Alex\nJordan\nSam");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <AppNav displayName="School admin" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Rostering & SSO</h1>
        <p className="mt-2 text-ink/70">CSV roster always on. Wonde MIS remains flag-off. SSO callback is FEATURE_DISABLED stub.</p>
        <textarea className="mt-6 w-full rounded border p-3 h-40" value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="CSV names" />
        {error && <div className="mt-4"><ErrorState body={error} /></div>}
        <button type="button" className="mt-4 rounded bg-accent px-4 py-2 text-white" onClick={() => rosterImport(SCHOOL, csv.split("\n").filter(Boolean).map((displayName) => ({ displayName }))).then((r) => setMsg(`Import ${r.importId} · valid ${r.valid}`)).catch((e) => setError(e.message || "Failed"))}>Upload CSV</button>
        {msg && <p className="mt-3" role="status">{msg}</p>}
      </main>
    </div>
  );
}
