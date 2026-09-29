"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { getDunning, paymentMethodConfirm, paymentMethodSetup } from "@/lib/api/billing";

/** C-09 dunning — child keeps access in grace */
export default function PaymentFailedPage() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getDunning().then(setD).catch(() => setError("Could not load dunning state"));
  }, []);

  async function updateCard() {
    await paymentMethodSetup();
    const r = await paymentMethodConfirm({ brand: "visa", last4: "4242", exp: "12/30" });
    setMsg(`Card updated · ${r.status}`);
    setD(await getDunning());
  }

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Payment failed</h1>
        <p className="mt-2 text-ink/70">Your child keeps access during the grace period.</p>
        {!d && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {d && !d.dunning && <div className="mt-8"><EmptyState title="No payment issue" body="Nothing to fix right now." /></div>}
        {d?.dunning && (
          <div className="mt-8 space-y-3">
            <p>Status {d.dunning.status} · Step {d.dunning.dunningLabel}</p>
            <p>Grace until {String(d.dunning.graceUntil ?? "—")}</p>
            <p>Child keeps access: {d.dunning.childKeepsAccess ? "Yes" : "No"}</p>
            <button type="button" className="rounded bg-accent px-4 py-2 text-white" onClick={updateCard}>Update card</button>
            {msg && <p role="status">{msg}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
