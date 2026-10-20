"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, MinusCircle } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { cycleLabel, formatPence } from "@/components/marketing/format";
import {
  groupPlans,
  isAffirmative,
  isNegative,
  parseMatrix,
  tabLabel,
  type ComparePlan,
  type GroupedPlan,
  type PriceRow,
} from "@/components/marketing/plans";
import * as api from "@/lib/api/w3";

function Cell({ value }: { value: string | undefined }) {
  if (isAffirmative(value)) {
    return (
      <span className="inline-flex items-center justify-center text-answer-correct">
        <CheckCircle size={22} weight="fill" aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (isNegative(value)) {
    return (
      <span className="inline-flex items-center justify-center text-neutral-400">
        <MinusCircle size={22} aria-hidden />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-[15px] font-medium text-neutral-900">{value}</span>;
}

/** C-04 — Plan comparison */
export default function Page() {
  const [data, setData] = useState<{ plans?: ComparePlan[]; matrixJson?: unknown; disclaimer?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<GroupedPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.comparePlans();
        if (!cancelled) setData(result ?? {});
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error && e.message ? e.message : "We couldn't load the comparison just now.");
      }
    })();
    // Monthly prices for the column headers; the table still works without them.
    api
      .getPricing()
      .then((r) => {
        if (!cancelled) setPrices(groupPlans((r.items ?? []) as PriceRow[]));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const matrix = useMemo(() => parseMatrix(data?.matrixJson), [data]);
  const plans = data?.plans ?? [];
  const features = matrix.features ?? [];

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow="Pricing"
        title="Compare plans"
        description="See exactly what is included in each Study Loop plan, side by side."
        breadcrumb={
          <Link href="/pricing" className="inline-flex items-center gap-1.5 font-semibold text-brand-navy hover:underline">
            <ArrowLeft size={16} /> Back to pricing
          </Link>
        }
      >
        <div aria-live="polite">
          {!data && !error && <LoadingState label="Loading comparison…" lines={6} />}
          {error && <ErrorState title="Comparison didn't load" body={`${error} Refresh the page to try again.`} />}
          {data && features.length === 0 && plans.length === 0 && (
            <EmptyState title="Comparison coming soon" body="Plan details are being prepared. Visit pricing to start a trial." action={<ButtonLink href="/pricing" variant="secondary">View pricing</ButtonLink>} />
          )}
          {data && (features.length > 0 || plans.length > 0) && (
            <div className="animate-rise space-y-6">
              <Card className="overflow-x-auto shadow-soft">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <caption className="sr-only">Features included in each plan</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-[28%] border-b border-neutral-200 px-5 py-5 align-bottom text-caption font-semibold uppercase tracking-wide text-neutral-600">
                        Feature
                      </th>
                      {plans.map((p) => {
                        const code = String(p.code ?? p.planId);
                        const priced = prices.find((x) => x.code === code);
                        const monthly = priced?.prices.MONTHLY ?? (priced ? Object.values(priced.prices)[0] : undefined);
                        return (
                          <th key={code} scope="col" className="border-b border-neutral-200 px-5 py-5 text-center align-bottom">
                            <span className="block text-caption font-semibold uppercase tracking-wide text-neutral-600">{tabLabel(p.tab)}</span>
                            <span className="mt-1 block text-[17px] font-semibold text-neutral-900">{p.displayName ?? p.code}</span>
                            {monthly && (
                              <span className="mt-1 block text-[14px] font-normal text-neutral-600">
                                <span className="tabular font-semibold text-neutral-900">{formatPence(monthly.pricePence, monthly.currency ?? "GBP")}</span>{" "}
                                {cycleLabel(monthly.billingCycle)}
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((f) => (
                      <tr key={f.key ?? f.label} className="even:bg-neutral-050/60">
                        <th scope="row" className="border-b border-neutral-100 px-5 py-4 text-[15px] font-medium text-neutral-700">
                          {f.label ?? f.key}
                        </th>
                        {plans.map((p) => {
                          const code = String(p.code ?? p.planId);
                          return (
                            <td key={code} className="border-b border-neutral-100 px-5 py-4 text-center">
                              <Cell value={f.plans?.[code]} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {plans.length > 0 && (
                      <tr>
                        <td className="px-5 py-5">
                          <span className="sr-only">Choose a plan</span>
                        </td>
                        {plans.map((p) => {
                          const code = String(p.code ?? p.planId);
                          const href = p.planId != null ? `/parent/checkout?planId=${encodeURIComponent(String(p.planId))}` : "/parent/checkout";
                          return (
                            <td key={code} className="px-5 py-5 text-center">
                              <ButtonLink href={href} size="sm" variant={code === "EXAM_PREP" ? "primary" : "secondary"} aria-label={`Start free trial of ${p.displayName ?? code}`}>
                                Start trial
                              </ButtonLink>
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
              <p className="text-caption text-neutral-600">
                {matrix.disclaimer ?? data.disclaimer ?? "Placeholder pricing until client sets final prices."}
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/parent/checkout">Start free trial</ButtonLink>
                <ButtonLink href="/plan-quiz" variant="secondary">Help me choose</ButtonLink>
              </div>
            </div>
          )}
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}
