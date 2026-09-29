"use client";
import { useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** C-06 Micro-subscription */
export default function MicroBillingPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const childId = typeof window !== "undefined" ? sessionStorage.getItem("childId") ?? "" : "";

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      await api.setupIntent();
      const r = await api.createMicroSub({
        studentId: childId,
        subjectId: 1,
        boardTrack: "AQA_8462",
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Micro-subscription</h1>
        <p className="mt-2 text-sm">Single subject / board. Amount in pence from config. Card via SetupIntent — no PAN stored here.</p>
        {busy && <div className="mt-6"><LoadingState /></div>}
        {error && <div className="mt-6"><ErrorState body={error} /></div>}
        <button type="button" className="mt-6 rounded border px-4 py-2" disabled={!childId || busy} onClick={purchase}>
          Purchase micro-sub
        </button>
        {!childId && <p className="mt-2 text-sm" role="status">Select a child session first.</p>}
        {result && (
          <pre className="mt-6 overflow-auto rounded border p-4 text-sm" aria-live="polite">{JSON.stringify(result, null, 2)}</pre>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/parent/billing">Billing home</Link></p>
      </main>
    </div>
  );
}
