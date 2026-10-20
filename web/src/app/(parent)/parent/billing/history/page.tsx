"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { listInvoices } from "@/lib/api/billing";
import { AppPage } from "@/components/ui/AppPage";
import { PageHeader, StatTile } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { InvoiceTable } from "@/components/parent/billing";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, formatPence, num, str } from "@/components/parent/format";

/** C-10 family billing history */
export default function BillingHistoryPage() {
  const { state, retry } = useLoad(
    async () => (await listInvoices()).items.map((i) => asRecord(i)),
    [],
    "Could not load invoices",
  );

  return (
    <AppPage>
      <Link
        href="/parent/billing"
        className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <CaretLeft size={14} aria-hidden /> Back to billing
      </Link>
      <PageHeader title="Billing history" description="Every invoice for your family account, newest first." />
      <LoadView state={state} onRetry={retry} forbiddenBody="Billing is managed from the parent account.">
        {(items) => {
          if (items.length === 0) return <EmptyState title="No invoices yet" body="Invoices appear after the first charge." />;
          const paid = items.filter((i) => str(i.status) === "PAID");
          const totalPaid = paid.reduce((sum, i) => sum + (num(i.totalPence) ?? 0), 0);
          const currency = str(items[0].currency)?.toUpperCase() ?? "GBP";
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <StatTile label="Invoices" value={items.length} />
                <StatTile label="Total paid" value={formatPence(totalPaid, currency)} hint={`${paid.length} paid`} />
              </div>
              <InvoiceTable items={items} />
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
