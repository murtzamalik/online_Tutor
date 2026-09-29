"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { cancelPreview, cancelSubscription, getSubscription, reactivateSubscription } from "@/lib/api/billing";

/** C-08 manage & two-click cancel */
export default function BillingManagePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    getSubscription().then(setData).catch(() => setError("Could not load subscription"));
  }, []);

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Manage subscription</h1>
        {!data && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && !data.subscription && <div className="mt-8"><EmptyState title="No subscription" body="Start a trial from checkout." /></div>}
        {data?.subscription && (
          <div className="mt-8 space-y-4">
            <p><strong>{data.subscription.planName}</strong> · {data.subscription.status}</p>
            <p className="text-sm text-ink/70">Trial ends {data.subscription.trialEndsAt ?? "—"} · Period end {data.subscription.currentPeriodEnd ?? "—"}</p>
            <p className="text-sm">Card {data.subscription.cardBrand ?? "—"} •••• {data.subscription.cardLast4 ?? "----"}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded border px-3 py-2" onClick={() => cancelPreview().then(setPreview)}>Cancel preview</button>
              {preview && <button type="button" className="rounded bg-danger px-3 py-2 text-white" onClick={() => cancelSubscription("too_expensive").then(() => getSubscription().then(setData))}>Confirm cancel</button>}
              <button type="button" className="rounded border px-3 py-2" onClick={() => reactivateSubscription().then(() => getSubscription().then(setData))}>Reactivate</button>
              <Link className="underline" href="/parent/billing/history">Invoices</Link>
              <Link className="underline" href="/parent/billing/payment-failed">Payment failed</Link>
            </div>
            {preview && <p className="text-sm" role="status">{preview.message} Ends {String(preview.endsAt)}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
