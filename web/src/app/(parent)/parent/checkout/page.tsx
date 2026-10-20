"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, LockSimple } from "@phosphor-icons/react";
import { createSubscription, setupIntent } from "@/lib/api/billing";
import { listStudents } from "@/lib/api/students";
import { getPricing } from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, KeyValue, PageHeader, Select, Field } from "@/components/ui/primitives";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { errorMessage, formatPence, isForbidden } from "@/components/parent/format";
import { groupPlans, type GroupedPlan, type PriceRow } from "@/components/marketing/plans";
import { cx } from "@/components/ui/cx";

type Child = { studentId: string; displayName: string; yearGroup?: string | null };

function CheckoutInner() {
  const params = useSearchParams();
  const [plans, setPlans] = useState<GroupedPlan[] | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [planId, setPlanId] = useState<string>(params.get("planId") ?? "");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">(params.get("cycle") === "YEARLY" ? "YEARLY" : "MONTHLY");
  const [childId, setChildId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ plan: string; child: string } | null>(null);

  useEffect(() => {
    Promise.all([getPricing(), listStudents()])
      .then(([p, s]) => {
        const grouped = groupPlans(p.items as PriceRow[]);
        setPlans(grouped);
        setChildren(s.items);
        setPlanId((cur) => cur || String(grouped.find((g) => g.code === "EXAM_PREP")?.planId ?? grouped[0]?.planId ?? ""));
        setChildId(s.items[0]?.studentId ?? "");
      })
      .catch((e: unknown) => {
        if (isForbidden(e)) setForbidden(true);
        else setLoadError(errorMessage(e, "We couldn't load the plans."));
      });
  }, []);

  const plan = useMemo(() => plans?.find((p) => String(p.planId) === planId) ?? null, [plans, planId]);
  const price = plan?.prices[cycle] ?? plan?.prices.MONTHLY;
  const child = children?.find((c) => c.studentId === childId);

  async function startTrial() {
    if (!plan || !child) return;
    setBusy(true);
    setError(null);
    try {
      await setupIntent();
      await createSubscription({
        planId: Number(plan.planId),
        billingCycle: cycle,
        items: [{ studentId: child.studentId, subjectId: 1, qualificationId: 1 }],
      });
      setDone({ plan: plan.name, child: child.displayName });
    } catch (e) {
      if (isForbidden(e)) setForbidden(true);
      else setError(errorMessage(e, "Checkout failed"));
    } finally {
      setBusy(false);
    }
  }

  if (forbidden) return <ForbiddenState body="Only a verified parent account can start a trial." />;
  if (loadError) return <ErrorState body={loadError} />;
  if (!plans || !children) return <LoadingState />;

  if (done) {
    return (
      <Card className="animate-rise">
        <CardBody className="flex flex-col items-center py-10 text-center">
          <CheckCircle size={44} weight="fill" className="text-answer-correct" />
          <h2 className="mt-3 text-h2 text-neutral-900">Your free trial has started</h2>
          <p className="mt-1.5 max-w-md text-neutral-600">
            {done.child} now has {done.plan}. We’ll remind you before the trial ends — cancel any time before then and you pay nothing.
          </p>
          <div className="mt-6 flex gap-2">
            <ButtonLink href="/parent/billing">Go to billing</ButtonLink>
            <ButtonLink href="/parent" variant="secondary">Back to children</ButtonLink>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (children.length === 0) {
    return (
      <Callout tone="info" title="Add a child first">
        A trial is set up for a child, so add one to get started.
        <div className="mt-3">
          <ButtonLink href="/parent/children/new" size="sm">Add a child</ButtonLink>
        </div>
      </Callout>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]" aria-live="polite">
      <Card>
        <CardHeader title="Choose a plan" description="You can switch plan or add subjects later." />
        <CardBody className="space-y-5">
          <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-3">
            {plans.map((p) => {
              const selected = String(p.planId) === planId;
              const pr = p.prices[cycle] ?? p.prices.MONTHLY;
              return (
                <button
                  key={p.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPlanId(String(p.planId))}
                  className={cx(
                    "rounded-md border p-3 text-left transition-colors duration-fast",
                    selected ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 hover:border-neutral-400",
                  )}
                >
                  <span className="block text-[15px] font-semibold text-neutral-900">{p.name}</span>
                  <span className="tabular mt-1 block text-caption text-neutral-600">
                    {pr ? `${formatPence(pr.pricePence)} / ${cycle === "YEARLY" ? "year" : "month"}` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Billing" htmlFor="cycle">
              <Select id="cycle" value={cycle} onChange={(e) => setCycle(e.target.value as "MONTHLY" | "YEARLY")}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </Field>
            <Field label="For" htmlFor="child">
              <Select id="child" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.studentId} value={c.studentId}>
                    {c.displayName}{c.yearGroup ? ` · ${c.yearGroup}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Summary" />
        <CardBody className="space-y-4">
          <KeyValue
            items={[
              ["Plan", plan?.name ?? "—"],
              ["Billing", cycle === "YEARLY" ? "Yearly" : "Monthly"],
              ["Due today", formatPence(0)],
              ["After the trial", price ? `${formatPence(price.pricePence)} / ${cycle === "YEARLY" ? "year" : "month"}` : "—"],
            ]}
          />
          <p className="flex items-start gap-2 text-caption text-neutral-600">
            <LockSimple size={16} className="mt-0.5 shrink-0" aria-hidden />
            Card details go straight to Stripe. We never see or store the card number or CVV.
          </p>
          {error && <Callout tone="danger" title="We couldn't start your trial">{error}</Callout>}
          <Button className="w-full" loading={busy} disabled={!plan || !child} onClick={startTrial}>
            Start free trial
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

/** C-03 — Stripe Elements card capture; no PAN/CVV to our servers */
export default function CheckoutPage() {
  return (
    <AppPage width="wide">
      <PageHeader title="Start your free trial" description="Pick a plan for your child. Nothing is charged until the trial ends." />
      <Suspense fallback={<LoadingState />}>
        <CheckoutInner />
      </Suspense>
    </AppPage>
  );
}
