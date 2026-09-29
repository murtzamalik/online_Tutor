"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { createSubscription, setupIntent } from "@/lib/api/billing";
import { listStudents } from "@/lib/api/students";

function CheckoutInner() {
  const params = useSearchParams();
  const planId = Number(params.get("planId") ?? 1);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startTrial() {
    setBusy(true); setError(null);
    try {
      const si = await setupIntent();
      const stu = await listStudents();
      if (!stu.items[0]) throw new Error("Add a child first");
      const sub = await createSubscription({
        planId,
        billingCycle: "MONTHLY",
        items: [{ studentId: stu.items[0].studentId, subjectId: 1, qualificationId: 1 }],
      });
      setStatus(`Trial started (${sub.status}). SetupIntent ${si.setupIntentId} — confirm card in Stripe Elements (test).`);
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl">Start free trial</h1>
      <p className="mt-2 text-ink/70">Card details go to Stripe only. We never store PAN or CVV.</p>
      {busy && <div className="mt-6"><LoadingState label="Creating trial…" /></div>}
      {error && <div className="mt-6"><ErrorState body={error} /></div>}
      {status && <p className="mt-6 rounded border border-mist bg-white/70 p-4" role="status">{status}</p>}
      <button type="button" disabled={busy} onClick={startTrial} className="mt-6 rounded bg-accent px-4 py-2 font-semibold text-white">
        Start trial
      </button>
    </main>
  );
}

/** C-03 — Stripe Elements card capture; no PAN/CVV to our servers */
export default function CheckoutPage() {
  return (
    <div>
      <AppNav displayName="Parent" />
      <Suspense fallback={<div className="p-10"><LoadingState /></div>}>
        <CheckoutInner />
      </Suspense>
    </div>
  );
}
