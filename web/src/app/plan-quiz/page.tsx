"use client";
import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Exam, Sparkle, Stack, type Icon } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { cycleLabel, formatPence, humanise } from "@/components/marketing/format";
import { groupPlans, type GroupedPlan, type PriceRow } from "@/components/marketing/plans";
import * as api from "@/lib/api/w3";

const GOALS: { value: string; label: string; hint: string; icon: Icon }[] = [
  { value: "CORE_THREE", label: "Focus on English, Maths and Science", hint: "The three core GCSEs most families start with.", icon: BookOpen },
  { value: "EXAM_PREP", label: "Broad exam prep across subjects", hint: "Practise and track progress in every subject they sit.", icon: Stack },
  { value: "EXAM_PREP_PLUS", label: "Exam prep plus timed mocks", hint: "Everything, plus full timed mock papers before the real thing.", icon: Exam },
];

/** A-09 — Which plan is right for us? */
export default function Page() {
  const [goal, setGoal] = useState("EXAM_PREP");
  const [recommendation, setRecommendation] = useState<{ recommendedPlan?: string; goal?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<GroupedPlan[]>([]);

  useEffect(() => {
    // Used to show the recommended plan's name and price; the quiz works without it.
    api
      .getPricing()
      .then((r) => setPlans(groupPlans((r.items ?? []) as PriceRow[])))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitPlanQuiz({ goal });
      setRecommendation(r);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Could not get a recommendation");
    } finally {
      setBusy(false);
    }
  }

  const code = recommendation?.recommendedPlan ?? "";
  const plan = plans.find((p) => p.code === code);
  const planName = plan?.name ?? code.replace(/_/g, " ");
  const monthly = plan?.prices.MONTHLY ?? (plan ? Object.values(plan.prices)[0] : undefined);
  const checkoutHref = plan ? `/parent/checkout?planId=${encodeURIComponent(String(plan.planId))}` : "/parent/checkout";

  return (
    <PublicFrame>
      <MarketingPage
        width="narrow"
        eyebrow="Plan finder"
        title="Which plan is right for us?"
        description="Answer one question and we will suggest a starting plan. You can change subjects or upgrade later."
      >
        <Card className="p-6 shadow-soft sm:p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <fieldset>
              <legend className="text-h2 text-neutral-900">What matters most right now?</legend>
              <div className="mt-5 space-y-3">
                {GOALS.map((g) => {
                  const selected = goal === g.value;
                  const GoalIcon = g.icon;
                  return (
                    <label
                      key={g.value}
                      className={cx(
                        "flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors duration-fast",
                        "focus-within:ring-2 focus-within:ring-brand-navy/30",
                        selected ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 hover:border-neutral-400",
                      )}
                    >
                      <input
                        type="radio"
                        name="goal"
                        value={g.value}
                        checked={selected}
                        onChange={() => setGoal(g.value)}
                        className="sr-only"
                      />
                      <span
                        className={cx(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                          selected ? "bg-brand-navy text-white" : "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        <GoalIcon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold text-neutral-900">{g.label}</span>
                        <span className="mt-0.5 block text-[14px] text-neutral-600">{g.hint}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cx(
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                          selected ? "border-brand-navy" : "border-neutral-400",
                        )}
                      >
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-navy" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {error && (
              <Callout tone="danger" title="We couldn't get a recommendation">
                {error} Please try again.
              </Callout>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="lg" loading={busy}>
                Get recommendation
              </Button>
            </div>
          </form>
        </Card>

        <div aria-live="polite">
          {recommendation && (
            <Card className="mt-6 animate-rise border-2 border-brand-teal/40 p-6 sm:p-8" role="status">
              <Badge tone="teal">
                <Sparkle size={14} weight="fill" /> Our suggestion
              </Badge>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-[28px] font-bold leading-tight text-neutral-900">{planName}</h2>
                {monthly && (
                  <p className="text-neutral-600">
                    <span className="tabular text-[24px] font-bold text-neutral-900">{formatPence(monthly.pricePence, monthly.currency ?? "GBP")}</span>{" "}
                    {cycleLabel(monthly.billingCycle)}
                  </p>
                )}
              </div>
              <p className="mt-3 text-neutral-600">
                Based on your goal ({humanise(String(recommendation.goal ?? goal)).toLowerCase()}), this is a solid place to start.
                You can change subjects or upgrade later.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={checkoutHref}>Start free trial</ButtonLink>
                <ButtonLink href="/pricing/compare" variant="secondary">Compare plans</ButtonLink>
                <ButtonLink href="/pricing" variant="tertiary">See pricing</ButtonLink>
              </div>
            </Card>
          )}
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}
