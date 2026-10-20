"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { getSubscription } from "@/lib/api/billing";
import { listStudents } from "@/lib/api/students";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Field, KeyValue, PageHeader, Select } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asArray, asRecord, errorMessage, formatPence, num, str } from "@/components/parent/format";

type Price = { planId: number; code: string; displayName: string; billingCycle: string; pricePence: number };
type Item = { studentId: string; subjectId: number; qualificationId: number };

const NO_ITEMS: Item[] = [];

/** C-05 — Change plan or subjects */
export default function Page() {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  const { state, retry, reload } = useLoad(
    async () => {
      const [pricing, sub] = await Promise.all([api.getPricing(), getSubscription()]);
      const prices: Price[] = pricing.items
        .map((p) => asRecord(p))
        .map((p) => ({
          planId: num(p.planId) ?? 0,
          code: str(p.code) ?? "",
          displayName: str(p.displayName) ?? str(p.code) ?? "Plan",
          billingCycle: str(p.billingCycle) ?? "MONTHLY",
          pricePence: num(p.pricePence) ?? 0,
        }))
        .filter((p) => p.code);
      const subscription = sub.subscription ? asRecord(sub.subscription) : null;
      let items: Item[] = asArray(sub.items).map((i) => {
        const r = asRecord(i);
        return { studentId: str(r.studentId) ?? "", subjectId: num(r.subjectId) ?? 1, qualificationId: num(r.qualificationId) ?? 1 };
      });
      if (items.length === 0) {
        const stu = await listStudents();
        items = stu.items.filter((c) => (c.enrolments?.length ?? 0) > 0).map((c) => ({ studentId: c.studentId, subjectId: 1, qualificationId: 1 }));
      }
      return { prices, subscription, items };
    },
    [],
    "Could not load plans",
  );

  const [planCode, setPlanCode] = useState("EXAM_PREP");
  const [cycle, setCycle] = useState("MONTHLY");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  // Start from the current plan and cycle.
  useEffect(() => {
    if (state.status !== "ready" || !state.data.subscription) return;
    const s = state.data.subscription;
    const current = state.data.prices.find((p) => p.planId === num(s.planId));
    if (current) setPlanCode(current.code);
    if (str(s.billingCycle)) setCycle(String(s.billingCycle));
  }, [state]);

  const plans = useMemo(() => {
    if (state.status !== "ready") return [];
    const seen = new Map<string, { code: string; displayName: string; planId: number }>();
    for (const p of state.data.prices) if (!seen.has(p.code)) seen.set(p.code, { code: p.code, displayName: p.displayName, planId: p.planId });
    return [...seen.values()];
  }, [state]);

  const selected = state.status === "ready" ? state.data.prices.find((p) => p.code === planCode && p.billingCycle === cycle) : undefined;
  const items = useMemo(() => (state.status === "ready" ? state.data.items : NO_ITEMS), [state]);

  useEffect(() => {
    if (!selected || items.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    api
      .planPreview({ planId: selected.planId, billingCycle: cycle, items }, token)
      .then((r) => !cancelled && setPreview(asRecord(r)))
      .catch((e) => !cancelled && setPreviewError(errorMessage(e, "Could not price this plan")))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.planId, cycle, items, token]);

  async function apply() {
    setBusy(true);
    setNote(null);
    try {
      await api.patchSubscription({ planCode, billingCycle: cycle }, token);
      setNote({ ok: true, text: "Plan change requested." });
      await reload();
    } catch (e) {
      setNote({ ok: false, text: errorMessage(e, "Could not apply change") });
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
      <PageHeader title="Change plan" description="Preview the new total before you confirm a change." />

      <LoadView state={state} onRetry={retry} forbiddenBody="Billing is managed from the parent account.">
        {({ prices, subscription }) => {
          const current = subscription ? prices.find((p) => p.planId === num(subscription.planId)) : undefined;
          const unchanged = !!current && current.code === planCode && str(subscription?.billingCycle) === cycle;
          return (
            <div className="space-y-6">
              {!subscription && (
                <Callout tone="info" title="You don't have a plan yet">
                  Start a free trial first; you can change plan any time after.{" "}
                  <Link href="/parent/checkout" className="font-semibold underline">
                    Start trial
                  </Link>
                </Callout>
              )}

              <Card>
                <CardHeader
                  title="Choose a plan"
                  description={current ? `Current plan: ${current.displayName}, ${str(subscription?.billingCycle) === "YEARLY" ? "yearly" : "monthly"}` : undefined}
                />
                <CardBody className="space-y-4">
                  <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-3">
                    {plans.map((p) => {
                      const price = prices.find((x) => x.code === p.code && x.billingCycle === cycle);
                      const on = p.code === planCode;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setPlanCode(p.code)}
                          className={cx(
                            "rounded-lg border p-4 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
                            on ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 bg-white hover:bg-neutral-050",
                          )}
                        >
                          <span className="block text-[15px] font-semibold text-neutral-900">{p.displayName}</span>
                          <span className="tabular mt-1 block text-caption text-neutral-600">
                            {price ? `${formatPence(price.pricePence)} / ${cycle === "YEARLY" ? "year" : "month"}` : "Not available"}
                          </span>
                          {current?.code === p.code && (
                            <Badge tone="neutral" className="mt-2">
                              Current
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Field label="Billing cycle" htmlFor="cycle" className="sm:w-56">
                    <Select id="cycle" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </Select>
                  </Field>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="New total" description="Calculated by our billing service, including VAT and any family discount." />
                <CardBody aria-live="polite">
                  {previewLoading ? (
                    <LoadingState lines={2} label="Pricing…" />
                  ) : previewError ? (
                    <Callout tone="danger">{previewError}</Callout>
                  ) : preview ? (
                    <>
                      <p className="tabular text-[32px] font-semibold leading-none text-neutral-900">
                        {formatPence(preview.totalPence ?? preview.subtotalPence, str(preview.currency) ?? "GBP")}
                        <span className="ml-2 text-[14px] font-normal text-neutral-600">per {cycle === "YEARLY" ? "year" : "month"}</span>
                      </p>
                      <KeyValue
                        className="mt-4"
                        items={[
                          ["Subtotal", <span key="s" className="tabular">{formatPence(preview.subtotalPence)}</span>],
                          ...(num(preview.siblingDiscountPence)
                            ? ([["Sibling discount", <span key="d" className="tabular">−{formatPence(preview.siblingDiscountPence)}</span>]] as Array<[string, ReactNode]>)
                            : []),
                          ...(num(preview.promoDiscountPence)
                            ? ([["Promo discount", <span key="p" className="tabular">−{formatPence(preview.promoDiscountPence)}</span>]] as Array<[string, ReactNode]>)
                            : []),
                          ["VAT", <span key="v" className="tabular">{formatPence(preview.vatPence)}</span>],
                        ]}
                      />
                    </>
                  ) : (
                    <p className="text-[14px] text-neutral-600">
                      {items.length === 0 ? "Add a child first to see a price." : "This plan is not available on that billing cycle."}
                    </p>
                  )}
                </CardBody>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Button loading={busy} disabled={!subscription || unchanged || !selected} onClick={apply}>
                  Apply change
                </Button>
                <ButtonLink href="/parent/billing" variant="tertiary">
                  Cancel
                </ButtonLink>
                {unchanged && <span className="text-caption text-neutral-600">This is your current plan.</span>}
              </div>
              <div aria-live="polite">{note && <Callout tone={note.ok ? "success" : "danger"}>{note.text}</Callout>}</div>
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
