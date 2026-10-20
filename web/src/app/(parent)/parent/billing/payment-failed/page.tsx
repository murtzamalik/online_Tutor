"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretLeft, CreditCard } from "@phosphor-icons/react";
import { getDunning, paymentMethodConfirm, paymentMethodSetup } from "@/lib/api/billing";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { SUB_STATUS_TONE } from "@/components/parent/billing";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatDate, humanise, num, str } from "@/components/parent/format";

/** C-09 dunning — child keeps access in grace */
export default function PaymentFailedPage() {
  const { state, retry, setData } = useLoad(() => getDunning(), [], "Could not load your payment status");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function updateCard() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await paymentMethodSetup();
      const r = await paymentMethodConfirm({ brand: "visa", last4: "4242", exp: "12/30" });
      setMsg(`Card updated · ${humanise(r.status)}`);
      setData(await getDunning());
    } catch (e) {
      setError(errorMessage(e, "Could not update your card. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppPage width="content">
      <Link
        href="/parent/billing"
        className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <CaretLeft size={14} aria-hidden /> Back to billing
      </Link>
      <PageHeader title="Payment status" description="If a payment fails, your child keeps access during the grace period while you update your card." />
      <LoadView state={state} onRetry={retry} forbiddenBody="Billing is managed from the parent account.">
        {(d) => {
          if (!d.dunning) return <EmptyState title="No payment issue" body="Nothing to fix right now." />;
          const dn = asRecord(d.dunning);
          const status = str(dn.status) ?? "";
          const failing = status === "PAST_DUE" || status === "UNPAID" || (num(dn.dunningStep) ?? 0) > 0;
          return (
            <div className="space-y-4" aria-live="polite">
              {msg && <Callout tone="success">{msg}</Callout>}
              {error && <Callout tone="danger">{error}</Callout>}
              {failing ? (
                <Callout tone="warning" title="Your last payment didn't go through">
                  {dn.childKeepsAccess
                    ? `Your child keeps access until ${formatDate(dn.graceUntil, "the grace period ends")}. Update your card to avoid any interruption.`
                    : "Access is paused until a payment succeeds. Update your card to restore it straight away."}
                </Callout>
              ) : (
                <Callout tone="success" title="No payment issue">
                  Your payments are up to date.
                </Callout>
              )}
              <Card>
                <CardHeader title="Subscription" action={<Badge tone={SUB_STATUS_TONE[status] ?? "neutral"}>{humanise(status)}</Badge>} />
                <CardBody>
                  <KeyValue
                    items={[
                      ["Retry step", humanise(dn.dunningLabel)],
                      ["Grace period until", formatDate(dn.graceUntil)],
                      ["Child keeps access", dn.childKeepsAccess ? "Yes" : "No"],
                    ]}
                  />
                  <Button className="mt-4" variant={failing ? "primary" : "secondary"} loading={busy} icon={<CreditCard size={18} aria-hidden />} onClick={updateCard}>
                    Update card
                  </Button>
                </CardBody>
              </Card>
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
