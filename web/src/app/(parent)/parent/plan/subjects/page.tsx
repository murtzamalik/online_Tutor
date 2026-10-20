"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { listStudents } from "@/lib/api/students";
import { planPreview } from "@/lib/api/billing";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, KeyValue, PageHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatPence, num, str } from "@/components/parent/format";

const planId = 1;

export default function PlanSubjectsPage() {
  const { state, retry } = useLoad(
    async () => {
      const stu = await listStudents();
      let preview: Awaited<ReturnType<typeof planPreview>> | null = null;
      let previewError: string | null = null;
      if (stu.items.some((c) => (c.enrolments?.length ?? 0) > 0)) {
        try {
          preview = await planPreview({
            planId,
            billingCycle: "MONTHLY",
            items: stu.items.filter((c) => (c.enrolments?.length ?? 0) > 0).map((c) => ({ studentId: c.studentId, subjectId: 1, qualificationId: 1 })),
          });
        } catch (e) {
          previewError = errorMessage(e, "Could not calculate the price");
        }
      }
      return { children: stu.items, preview, previewError };
    },
    [],
    "Could not load plan selector",
  );

  return (
    <AppPage>
      <PageHeader title="Plan & subjects" description="Live price preview, calculated by our billing service including VAT and family discounts." />
      <LoadView state={state} onRetry={retry} forbiddenBody="Plans are managed from the parent account.">
        {({ children, preview, previewError }) =>
          children.length === 0 ? (
            <EmptyState
              title="No children yet"
              body="Add a child before selecting subjects."
              action={<ButtonLink href="/parent/children/new">Add a child</ButtonLink>}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader title="Children" description="Each child's subjects are chosen during onboarding." />
                <div className="divide-y divide-neutral-100">
                  {children.map((c) => {
                    const subjects = (c.enrolments ?? [])
                      .map((e) => asRecord(e))
                      .map((e) => str(e.title) ?? str(e.specCode))
                      .filter((x): x is string => !!x);
                    return (
                      <div key={c.studentId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div>
                          <p className="font-semibold text-neutral-900">{c.displayName}</p>
                          <p className="mt-0.5 flex flex-wrap gap-1.5">
                            {subjects.length ? (
                              subjects.map((s) => (
                                <Badge key={s} tone="brand">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-caption text-neutral-600">No subjects yet</span>
                            )}
                          </p>
                        </div>
                        <ButtonLink href={`/onboarding/subjects?studentId=${c.studentId}`} size="sm" variant="tertiary">
                          {subjects.length ? "Manage subjects" : "Choose subjects"}
                        </ButtonLink>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader title="Price preview" description="Monthly, per family" />
                <CardBody aria-live="polite">
                  {previewError ? (
                    <Callout tone="danger">{previewError}</Callout>
                  ) : preview ? (
                    <>
                      <p className="tabular text-[32px] font-semibold leading-none text-neutral-900">
                        {formatPence(preview.totalPence, preview.currency)}
                        <span className="ml-2 text-[14px] font-normal text-neutral-600">incl. VAT</span>
                      </p>
                      <KeyValue
                        className="mt-4"
                        items={[
                          ["Subtotal", formatPence(preview.subtotalPence, preview.currency)],
                          ...(num(preview.siblingDiscountPence)
                            ? ([["Sibling discount", `−${formatPence(preview.siblingDiscountPence, preview.currency)}`]] as Array<[string, string]>)
                            : []),
                          ["VAT", formatPence(preview.vatPence, preview.currency)],
                        ]}
                      />
                      <ButtonLink
                        href={`/parent/checkout?planId=${planId}`}
                        className="mt-5 w-full"
                        icon={<ArrowRight size={18} aria-hidden />}
                      >
                        Continue to checkout
                      </ButtonLink>
                    </>
                  ) : (
                    <p className="text-[14px] text-neutral-600">No price available yet.</p>
                  )}
                </CardBody>
              </Card>
            </div>
          )
        }
      </LoadView>
    </AppPage>
  );
}
