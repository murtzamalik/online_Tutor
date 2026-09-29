"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { listInvoices } from "@/lib/api/billing";

/** C-10 family billing history */
export default function BillingHistoryPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listInvoices().then((r) => setItems(r.items)).catch(() => setError("Could not load invoices"));
  }, []);
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Billing history</h1>
        {!items && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {items && items.length === 0 && <div className="mt-8"><EmptyState title="No invoices yet" body="Invoices appear after the first charge." /></div>}
        <ul className="mt-8 space-y-3">
          {items?.map((inv) => (
            <li key={inv.invoiceId} className="rounded border border-mist bg-white/70 px-4 py-3">
              <p className="font-semibold">{inv.number ?? inv.invoiceId} · {inv.status}</p>
              <p className="text-sm">£{((inv.totalPence ?? 0) / 100).toFixed(2)} {inv.currency}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
