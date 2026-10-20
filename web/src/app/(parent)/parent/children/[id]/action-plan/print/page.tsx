"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretLeft, Printer } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, MasteryBadge, PageHeader } from "@/components/ui/primitives";
import { useChildName } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asArray, asRecord, formatDate, num } from "@/components/parent/format";

/** H-08 — Printable action plan */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const name = useChildName(params.id);
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;

  const { state, retry } = useLoad(() => api.actionPlan(params.id, token), [params.id, token], "Could not load the action plan");

  return (
    <AppPage width="content">
      <div className="print:hidden">
        <Link
          href={`/parent/children/${params.id}`}
          className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <CaretLeft size={14} aria-hidden /> Back to progress
        </Link>
      </div>
      <PageHeader
        eyebrow={name ?? "Your child"}
        title="Action plan"
        description={`Printed ${formatDate(new Date())}. Tick each step off as it's done.`}
        actions={
          state.status === "ready" ? (
            <Button className="print:hidden" icon={<Printer size={18} aria-hidden />} onClick={() => window.print()}>
              Print
            </Button>
          ) : undefined
        }
      />

      <LoadView state={state} onRetry={retry}>
        {(raw) => {
          const plan = asRecord(raw);
          const actions = asArray(plan.actions).filter((a): a is string => typeof a === "string");
          const focus = asArray(plan.focusTopics).map((t) => asRecord(t));
          return (
            <div className="space-y-6 animate-rise">
              <Card className="print:border-neutral-400">
                <CardBody>
                  <h2 className="text-h2 text-neutral-900">This week</h2>
                  {actions.length === 0 ? (
                    <p className="mt-2 text-neutral-600">No actions yet — they appear once your child has practised.</p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {actions.map((a, i) => (
                        <li key={a} className="flex items-start gap-3 text-[16px] text-neutral-900">
                          <span aria-hidden className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-neutral-400" />
                          <span>
                            <span className="sr-only">Step {i + 1}: </span>
                            {a}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardBody>
              </Card>

              {focus.length > 0 && (
                <Card className="print:border-neutral-400">
                  <CardBody>
                    <h2 className="text-h2 text-neutral-900">Topics to focus on</h2>
                    <ul className="mt-3 divide-y divide-neutral-100">
                      {focus.map((t, i) => {
                        const p = num(t.pKnow);
                        return (
                          <li key={String(t.topicId ?? i)} className="flex items-center justify-between gap-4 py-2.5">
                            <span className="text-[15px] text-neutral-900">{String(t.topicName ?? `Topic ${String(t.topicId ?? "—")}`)}</span>
                            <span className="flex items-center gap-3">
                              <span className="tabular text-caption text-neutral-600">{p != null ? `${Math.round(p * 100)}%` : "—"}</span>
                              <MasteryBadge value={p} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </div>
          );
        }}
      </LoadView>
    </AppPage>
  );
}
