"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowsClockwise, Check, Compass, Minus, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { CtaBand, MarketingPage, onNavyPrimary, onNavySecondary } from "@/components/marketing/MarketingPage";
import { cycleLabel, formatPence } from "@/components/marketing/format";
import {
  groupPlans,
  parseMatrix,
  planFeatures,
  tabLabel,
  type ComparePlan,
  type Matrix,
  type PriceRow,
} from "@/components/marketing/plans";
import * as api from "@/lib/api/w3";

type Cycle = "MONTHLY" | "YEARLY";

/** C-01 — Pricing */
export default function Page() {
  const [items, setItems] = useState<PriceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle>("MONTHLY");
  const [matrix, setMatrix] = useState<Matrix>({ features: [] });
  const [comparePlans, setComparePlans] = useState<ComparePlan[]>([]);
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pricing = await api.getPricing();
        if (!cancelled) setItems((pricing.items ?? []) as PriceRow[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error && e.message ? e.message : "We couldn't load plans just now.");
      }
    })();
    // Feature lists come from the comparison matrix; plan cards still render if this fails.
    api
      .comparePlans()
      .then((res: { plans?: ComparePlan[]; matrixJson?: unknown } | null) => {
        if (cancelled || !res) return;
        setMatrix(parseMatrix(res.matrixJson));
        setComparePlans(res.plans ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(() => groupPlans(items), [items]);
  const tabs = useMemo(() => Array.from(new Set(plans.map((p) => p.tab ?? ""))).filter(Boolean), [plans]);
  const activeTab = tab ?? tabs[0] ?? null;
  const visible = tabs.length > 1 && activeTab ? plans.filter((p) => p.tab === activeTab) : plans;
  const hasYearly = plans.some((p) => p.prices.YEARLY);

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow="Pricing"
        title="Simple plans for every family"
        description="Every plan includes exam-board-accurate practice, instant marking and clear parent reports. Start with a free trial and change plan whenever you like."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {tabs.length > 1 ? (
            <div role="tablist" aria-label="Qualification" className="inline-flex rounded-lg border border-neutral-200 bg-neutral-050 p-1">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t}
                  onClick={() => setTab(t)}
                  className={cx(
                    "rounded-md px-4 py-2 text-[14px] font-semibold transition-colors duration-fast",
                    activeTab === t ? "bg-white text-brand-navy shadow-soft" : "text-neutral-600 hover:text-neutral-900",
                  )}
                >
                  {tabLabel(t)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[15px] font-semibold text-neutral-900">{tabs[0] ? tabLabel(tabs[0]) : "All plans"}</p>
          )}

          <div role="radiogroup" aria-label="Billing cycle" className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-050 p-1">
            {(["MONTHLY", "YEARLY"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cycle === c}
                onClick={() => setCycle(c)}
                className={cx(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors duration-fast",
                  cycle === c ? "bg-brand-navy text-white shadow-soft" : "text-neutral-600 hover:text-neutral-900",
                )}
              >
                {c === "MONTHLY" ? "Monthly" : "Yearly"}
                {c === "YEARLY" && hasYearly && (
                  <span className={cx("rounded-full px-1.5 py-px text-[11px]", cycle === c ? "bg-white/20" : "bg-brand-tealSoft text-brand-teal")}>
                    Save
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div aria-live="polite" className="mt-8">
          {!items && !error && (
            <div className="grid gap-5 md:grid-cols-3" role="status">
              <span className="sr-only">Loading plans…</span>
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-4 h-6 w-2/3" />
                  <Skeleton className="mt-6 h-10 w-1/2" />
                  <div className="mt-6 space-y-2.5">
                    {[0, 1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-3" />
                    ))}
                  </div>
                  <Skeleton className="mt-8 h-11 w-full" />
                </Card>
              ))}
            </div>
          )}
          {error && <ErrorState title="Plans didn't load" body={`${error} Refresh the page to try again.`} />}
          {items && plans.length === 0 && (
            <EmptyState title="Plans coming soon" body="We are finalising plan details. Check back shortly or start a trial from checkout." />
          )}
          {visible.length > 0 && (
            <ul className="grid animate-rise gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((plan) => {
                const price = plan.prices[cycle] ?? plan.prices.MONTHLY ?? Object.values(plan.prices)[0];
                const monthly = plan.prices.MONTHLY?.pricePence;
                const yearly = plan.prices.YEARLY?.pricePence;
                const showingYearly = (price?.billingCycle ?? "").toUpperCase() === "YEARLY";
                const saving =
                  monthly && yearly && monthly * 12 > yearly ? Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100) : null;
                const featured = plan.code === "EXAM_PREP";
                const features = planFeatures(
                  plan.code,
                  matrix,
                  comparePlans.find((c) => String(c.code ?? c.planId) === plan.code),
                );
                return (
                  <li key={String(plan.planId)}>
                    <Card
                      className={cx(
                        "relative flex h-full flex-col p-6",
                        featured ? "border-2 border-brand-navy shadow-raised" : "shadow-soft",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">{tabLabel(plan.tab)}</p>
                        {featured && (
                          <Badge tone="brand">
                            <Sparkle size={12} weight="fill" /> Recommended
                          </Badge>
                        )}
                      </div>
                      <h2 className="mt-2 text-h2 text-neutral-900">{plan.name}</h2>
                      <div className="mt-5 flex items-baseline gap-1.5">
                        <span className="tabular text-[36px] font-bold leading-none tracking-tight text-neutral-900">
                          {formatPence(price?.pricePence, price?.currency ?? "GBP")}
                        </span>
                        <span className="text-[14px] text-neutral-600">{cycleLabel(price?.billingCycle ?? cycle)}</span>
                      </div>
                      <p className="mt-2 min-h-[20px] text-caption text-neutral-600">
                        {showingYearly && yearly ? (
                          <>
                            Works out at <span className="tabular font-semibold text-neutral-900">{formatPence(Math.round(yearly / 12), price?.currency ?? "GBP")}</span> a month
                            {saving ? <span className="ml-1.5 font-semibold text-brand-teal">· save {saving}%</span> : null}
                          </>
                        ) : saving ? (
                          <>Save {saving}% when you pay yearly</>
                        ) : null}
                      </p>

                      {features.length > 0 && (
                        <ul className="mt-6 space-y-3 border-t border-neutral-100 pt-6">
                          {features.map((f) => (
                            <li key={f.label} className={cx("flex items-start gap-2.5 text-[15px]", f.included ? "text-neutral-700" : "text-neutral-400")}>
                              {f.included ? (
                                <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-answer-correct" aria-hidden />
                              ) : (
                                <Minus size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                              )}
                              <span>
                                {f.label}
                                {!f.included && <span className="sr-only"> (not included)</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-auto flex flex-col gap-2 pt-8">
                        <ButtonLink
                          href={`/parent/checkout?planId=${encodeURIComponent(String(plan.planId))}`}
                          variant={featured ? "primary" : "secondary"}
                          className="w-full"
                        >
                          Start free trial
                        </ButtonLink>
                        <Link
                          href="/pricing/compare"
                          className="rounded-md py-1.5 text-center text-[14px] font-semibold text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
                        >
                          See what&apos;s included
                        </Link>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {plans.length > 0 && (
          <p className="mt-6 text-caption text-neutral-600">
            Amounts shown are illustrative placeholders until final prices are confirmed.
          </p>
        )}

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Privacy-first", body: "UK-hosted, no third-party trackers in learner areas, built under the ICO Children’s Code." },
            { icon: ArrowsClockwise, title: "Change any time", body: "Switch plan, add subjects or cancel from your parent account." },
            { icon: Compass, title: "Not sure yet?", body: "Answer one question and we’ll suggest the best place to start.", href: "/plan-quiz", cta: "Take the plan quiz" },
          ].map(({ icon: Icon, title, body, href, cta }) => (
            <Card key={title} className="p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-neutral-900">{title}</h3>
              <p className="mt-1.5 text-[15px] text-neutral-600">{body}</p>
              {href && (
                <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand-navy hover:underline">
                  {cta} <ArrowRight size={16} />
                </Link>
              )}
            </Card>
          ))}
        </div>

        <CtaBand
          className="mt-12"
          title="Want to see it first?"
          body="Try a real exam-style question and see how marking works — no account needed."
          actions={
            <>
              <Link href="/try" className={onNavyPrimary}>Try a question</Link>
              <Link href="/pricing/compare" className={onNavySecondary}>Compare plans</Link>
            </>
          }
        />
      </MarketingPage>
    </PublicFrame>
  );
}
