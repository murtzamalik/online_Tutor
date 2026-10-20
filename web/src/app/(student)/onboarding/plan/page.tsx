"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowsClockwise, Cards, CheckCircle, Exam, Notebook, PencilSimpleLine, Repeat, type Icon } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView, StepHeader } from "@/components/student/StudentUI";
import { formatDate, toFailure, type LoadFailure } from "@/components/student/studentData";
import { cx } from "@/components/ui/cx";
import * as api from "@/lib/api/w3";

type PlanItem = {
  itemId?: string;
  dayOfWeek?: number;
  topicId?: number;
  topicName?: string;
  activityKind?: string;
  minutes?: number;
  completedAt?: string | null;
};

type PlanData = {
  planId?: string;
  weekStart?: string;
  rationaleText?: string;
  status?: string;
  items?: PlanItem[];
};

const DAY_LABELS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ACTIVITY: Record<string, { label: string; icon: Icon; href: (topicId?: number) => string }> = {
  PRACTICE: { label: "Practice", icon: PencilSimpleLine, href: () => "/practice" },
  FLASHCARDS: { label: "Flashcards", icon: Cards, href: () => "/revise" },
  NOTES: { label: "Revision notes", icon: Notebook, href: (t) => (t ? `/revise/notes/${t}` : "/revise") },
  REVIEW: { label: "Review", icon: Repeat, href: (t) => (t ? `/revise/check/${t}` : "/revise") },
  MOCK: { label: "Mock paper", icon: Exam, href: () => "/mock/new" },
};

/** B-07 — Personalised weekly plan */
export default function Page() {
  const [data, setData] = useState<PlanData | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;

  async function loadPlan(forceGenerate = false) {
    if (!studentId) throw new Error("Sign in as a student first");
    let plan = (forceGenerate ? null : await api.getWeeklyPlan(studentId, token)) as PlanData | null;
    if (forceGenerate || (!plan?.items?.length && !plan?.planId)) {
      plan = (await api.generateWeeklyPlan(studentId, {}, token)) as PlanData;
    }
    setData(plan);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadPlan(false);
      } catch (e: unknown) {
        if (!cancelled) setFailure(toFailure(e, "Could not load"));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, studentId]);

  async function regenerate() {
    setBusy(true);
    setRegenError(null);
    try {
      await loadPlan(true);
    } catch (e: unknown) {
      setRegenError(toFailure(e, "Could not generate plan").message);
    } finally {
      setBusy(false);
    }
  }

  const items = (data?.items ?? []).slice().sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0));
  const totalMinutes = items.reduce((sum, i) => sum + (i.minutes ?? 0), 0);
  const todayIdx = ((new Date().getDay() + 6) % 7) + 1; // Monday = 1

  return (
    <AppPage width="content">
      <StepHeader step={5} title="Your weekly plan" description="A short week of study built from your current mastery." />

      {failure ? (
        <FailureView failure={failure} />
      ) : !data ? (
        <LoadingState label="Building your plan…" lines={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No plan yet"
          body="Generate a weekly plan from your enrolment topics."
          action={
            <Button loading={busy} onClick={regenerate}>
              Generate weekly plan
            </Button>
          }
        />
      ) : (
        <div className="animate-rise space-y-6">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Week of {formatDate(data.weekStart, { day: "numeric", month: "long" })}</p>
              <p className="tabular mt-1 text-[22px] font-bold text-neutral-900">
                {totalMinutes} min <span className="text-[15px] font-medium text-neutral-600">across {items.length} sessions</span>
              </p>
            </div>
            {data.status && <Badge tone={data.status === "ACTIVE" ? "teal" : "neutral"}>{data.status === "ACTIVE" ? "Active" : data.status}</Badge>}
          </Card>

          {data.rationaleText && <Callout tone="info" title="Why this plan">{data.rationaleText}</Callout>}

          <ol className="space-y-2.5">
            {items.map((item, i) => {
              const a = ACTIVITY[item.activityKind ?? ""] ?? { label: item.activityKind || "Practice", icon: PencilSimpleLine, href: () => "/practice" };
              const ActivityIcon = a.icon;
              const isToday = item.dayOfWeek === todayIdx;
              const done = !!item.completedAt;
              return (
                <li key={item.itemId ?? i}>
                  <Link
                    href={a.href(item.topicId)}
                    className={cx(
                      "flex items-center gap-4 rounded-lg border bg-white px-4 py-3.5 transition-shadow duration-fast hover:shadow-raised",
                      isToday ? "border-brand-navy/40 ring-1 ring-brand-navy/20" : "border-neutral-200",
                    )}
                  >
                    <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", done ? "bg-brand-tealSoft text-brand-teal" : "bg-brand-navySoft text-brand-navy")}>
                      {done ? <CheckCircle size={20} weight="fill" /> : <ActivityIcon size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-caption font-semibold uppercase tracking-wide text-neutral-600">
                        {DAY_LABELS[item.dayOfWeek ?? 0] || `Day ${item.dayOfWeek ?? i + 1}`}
                        {isToday && <Badge tone="brand">Today</Badge>}
                      </span>
                      <span className="block truncate font-semibold text-neutral-900">
                        {a.label} · {item.topicName || "Topic"}
                      </span>
                    </span>
                    {item.minutes != null && <span className="tabular shrink-0 text-[14px] text-neutral-600">{item.minutes} min</span>}
                  </Link>
                </li>
              );
            })}
          </ol>

          {regenError && <Callout tone="danger" title="Couldn’t regenerate">{regenError}</Callout>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" loading={busy} onClick={regenerate} icon={<ArrowsClockwise size={18} />}>
              Regenerate plan
            </Button>
            <ButtonLink href="/home" size="lg">
              Go to Home
            </ButtonLink>
          </div>
        </div>
      )}
    </AppPage>
  );
}
