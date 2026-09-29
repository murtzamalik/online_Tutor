"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getDpa, schoolInvoices, signDpa } from "@/lib/api/w2";
const SCHOOL = "a1000000-0000-4000-8000-000000000001";
export default function SchoolBillingPage() {
  const [dpa, setDpa] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([getDpa(SCHOOL), schoolInvoices(SCHOOL)])
      .then(([d, inv]) => { setDpa(d); setInvoices(inv.items); })
      .catch(() => setError("Could not load school billing"));
  }, []);
  return (
    <div>
      <AppNav displayName="Business manager" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">DPA & invoices</h1>
        {!dpa && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {dpa && (
          <div className="mt-6 space-y-3">
            <p>DPA status: {dpa.status}</p>
            <button type="button" className="rounded bg-accent px-4 py-2 text-white" onClick={() => signDpa(SCHOOL, { signerName: "Pilot Admin", signerRole: "SADM" }).then(setDpa)}>Sign DPA</button>
            <h2 className="font-display text-2xl mt-6">Invoices</h2>
            <ul className="space-y-2">{invoices.map((i) => <li key={i.invoiceId} className="rounded border p-3">{i.number} · £{((i.totalPence ?? 0)/100).toFixed(2)} · {i.status}</li>)}</ul>
          </div>
        )}
      </main>
    </div>
  );
}
