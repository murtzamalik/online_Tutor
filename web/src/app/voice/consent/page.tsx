"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { listStudents } from "@/lib/api/students";
import { connectivityCheck, grantVoiceConsent } from "@/lib/api/w2";

/** J-06 */
export default function VoiceConsentPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [check, setCheck] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([listStudents(), connectivityCheck()])
      .then(([s, c]) => { setStudents(s.items); setCheck(c); })
      .catch(() => setError("Could not load voice consent"));
  }, []);
  if (error) return <div className="p-10"><ErrorState body={error} /></div>;
  if (!check) return <div className="p-10"><LoadingState /></div>;
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Voice consent</h1>
        <p className="mt-2 text-ink/70">Audio is processed by Google Speech via our AI gateway only after consent.</p>
        <p className="mt-4 text-sm">Connectivity: mic {String(check.micOk)} · network {String(check.networkOk)} · gateway {String(check.gatewayReachable)}</p>
        {check.errorClass && <ErrorState body={`Degraded: ${check.errorClass}`} />}
        <ul className="mt-6 space-y-3">
          {students.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between rounded border p-3">
              <span>{s.displayName}</span>
              <button type="button" className="rounded bg-accent px-3 py-1 text-white text-sm" onClick={() => grantVoiceConsent(s.studentId).then(() => setMsg(`Granted for ${s.displayName}`))}>Grant consent</button>
            </li>
          ))}
        </ul>
        {msg && <p className="mt-4" role="status">{msg}</p>}
        <Link className="mt-6 inline-block underline" href="/voice/demo">Open voice session</Link>
      </main>
    </div>
  );
}
