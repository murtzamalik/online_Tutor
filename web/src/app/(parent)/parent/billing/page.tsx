"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowsClockwise, CreditCard, Receipt, WarningCircle } from "@phosphor-icons/react";
import { cancelPreview, cancelSubscription, getSubscription, listInvoices, reactivateSubscription } from "@/lib/api/billing";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { InvoiceTable, SUB_STATUS_TONE } from "@/components/parent/billing";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatDate, humanise, num, str } from "@/components/parent/format";

/** C-08 manage & two-click cancel */
export default function BillingManagePage() {
  const { state, retry, setData } = useLoad(() => getSubscription(), [], "Could not load your subscription");
  const [preview, setPreview] = useState<{ message?: string; endsAt?: unknown } | null>(null);
  const [busy, setBusy] = useState<"preview" | "cancel" | "reactivate" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[] | null>(null);
  const [invoiceError, setInvoiceError] = useState(false);

  useEffect(() => {
    listInvoices()
      .then((r) => setInvoices(r.items.map((i) => asRecord(i))))
      .catch(() => setInvoiceError(true));
  }, []);

  async function run(kind: "preview" | "cancel" | "reactivate") {
    setBusy(kind);
    setActionError(null);
    setNotice(null);
    try {
      if (kind === "preview") {
        setPreview(await cancelPreview());
      } else if (kind === "cancel") {
        await cancelSubscription("too_expensive");
        setData(await getSubscription());
        setPreview(null);
        setNotice("Cancellation scheduled. Your children keep access until the end of the current period.");
      } else {
        await reactivateSubscription();
        setData(await getSubscription());
        setNotice("Subscription reactivated. Nothing else changes.");
      }
    } catch (e) {
      setActionError(errorMessage(e, "That didn't work. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppPage>
      <PageHeader
        title="Billing"
        description="Your plan, payment method and invoices. Cancel any time with a two-step confirm."
        actions={
          <ButtonLink href="/parent/billing/history" variant="secondary" size="sm" icon={<Receipt size={16} aria-hidden />}>
            All invoices
          </ButtonLink>
        }
      />

      <LoadView state={state} onRetry={retry} forbiddenBody="Billing is managed from the parent account.">
        {(data) => {
          const sub = data.subscription ? asRecord(data.subscription) : null;
          if (!sub) {
            return (
              <EmptyState
                title="No active plan yet"
                body="Start a free trial to unlock adaptive practice for your children. Card details go to Stripe only."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <ButtonLink href="/parent/checkout">Start trial</ButtonLink>
                    <ButtonLink href="/pricing" variant="secondary">
                      See pricing
                    </ButtonLink>
                  </div>
                }
              />
            );
          }
          const status = str(sub.status) ?? "";
          const cancelling = sub.cancelAtPeriodEnd === true;
          const discount = num(sub.familyDiscountPct);
          return (
            <div className="space-y-6" aria-live="polite">
              {notice && <Callout tone="success">{notice}</Callout>}
              {actionError && <Callout tone="danger">{actionError}</Callout>}
              {status === "PAST_DUE" && (
                <Callout tone="warning" title="Your last payment didn't go through">
                  Your children keep access during the grace period.{" "}
                  <Link href="/parent/billing/payment-failed" className="font-semibold underline">
                    Update your card
                  </Link>
                </Callout>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader
                    title={str(sub.planName) ?? "Your plan"}
                    description={`${humanise(sub.billingCycle, "Monthly")} billing · ${data.items.length} subject${data.items.length === 1 ? "" : "s"}`}
                    action={<Badge tone={SUB_STATUS_TONE[status] ?? "neutral"}>{cancelling ? "Cancels at period end" : humanise(status)}</Badge>}
                  />
                  <CardBody>
                    <KeyValue
                      items={[
                        ...(sub.trialEndsAt ? ([["Trial ends", formatDate(sub.trialEndsAt)]] as Array<[string, string]>) : []),
                        [cancelling ? "Access ends" : "Next renewal", formatDate(sub.currentPeriodEnd)],
                        ...(sub.graceUntil ? ([["Grace period until", formatDate(sub.graceUntil)]] as Array<[string, string]>) : []),
                        ...(discount ? ([["Family discount", `${discount}%`]] as Array<[string, string]>) : []),
                      ]}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ButtonLink href="/parent/billing/change" variant="secondary" size="sm" icon={<ArrowsClockwise size={16} aria-hidden />}>
                        Change plan
                      </ButtonLink>
                      {cancelling ? (
                        <Button size="sm" loading={busy === "reactivate"} onClick={() => run("reactivate")}>
                          Reactivate
                        </Button>
                      ) : (
                        !preview && (
                          <Button variant="tertiary" size="sm" loading={busy === "preview"} onClick={() => run("preview")}>
                            Cancel subscription
                          </Button>
                        )
                      )}
                    </div>

                    {preview && !cancelling && (
                      <div className="mt-4 space-y-3 rounded-md border border-answer-incorrect/30 bg-[#FBE9E7]/50 p-4" role="group" aria-label="Confirm cancellation">
                        <p className="flex items-center gap-2 font-semibold text-neutral-900">
                          <WarningCircle size={18} className="text-answer-incorrect" aria-hidden /> Cancel your subscription?
                        </p>
                        <p className="text-[14px] text-neutral-700">
                          {preview.message ?? "Access continues until the end of the current period."} Access ends{" "}
                          <strong>{formatDate(preview.endsAt)}</strong>.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="destructive" size="sm" loading={busy === "cancel"} onClick={() => run("cancel")}>
                            Confirm cancel
                          </Button>
                          <Button variant="tertiary" size="sm" onClick={() => setPreview(null)}>
                            Keep subscription
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Payment method" />
                  <CardBody className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-14 items-center justify-center rounded-md border border-neutral-200 bg-neutral-050 text-neutral-600">
                        <CreditCard size={22} aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold capitalize text-neutral-900">{str(sub.cardBrand) ?? "No card on file"}</p>
                        <p className="tabular text-caption text-neutral-600">
                          {sub.cardLast4 ? `•••• ${String(sub.cardLast4)}` : "Add a card before the trial ends"}
                        </p>
                      </div>
                    </div>
                    <p className="text-caption text-neutral-600">Card details are held by Stripe. We never store the full number or CVV.</p>
                    <Link href="/parent/billing/payment-failed" className="inline-block text-[14px] font-semibold text-brand-navy hover:underline">
                      Payment issues
                    </Link>
                  </CardBody>
                </Card>
              </div>

              <section aria-labelledby="recent-invoices">
                <div className="mb-3 flex items-end justify-between">
                  <h2 id="recent-invoices" className="text-h2 text-neutral-900">
                    Recent invoices
                  </h2>
                  <Link href="/parent/billing/history" className="text-[14px] font-semibold text-brand-navy hover:underline">
                    View all
                  </Link>
                </div>
                {invoiceError ? (
                  <Callout tone="neutral">Invoices could not be loaded just now. Open the full history to try again.</Callout>
                ) : invoices === null ? (
                  <LoadingState lines={2} />
                ) : invoices.length === 0 ? (
                  <EmptyState title="No invoices yet" body="Invoices appear after the first charge." />
                ) : (
                  <InvoiceTable items={invoices.slice(0, 5)} />
                )}
              </section>
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
