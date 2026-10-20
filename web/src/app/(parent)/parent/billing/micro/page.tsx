"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import * as api from "@/lib/api/w4";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/components/shell/session";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Field, KeyValue, PageHeader, Select } from "@/components/ui/primitives";
import { ForbiddenState } from "@/components/ui/states";
import { asRecord, errorMessage, formatDate, formatPence, humanise, isForbidden, str } from "@/components/parent/format";

/** C-06 Micro-subscription */
export default function MicroBillingPage() {
  const session = useSession();
  const children = (session?.children ?? [])
    .map((c) => ({ id: String(c.studentId ?? ""), name: typeof c.displayName === "string" ? c.displayName : "Child" }))
    .filter((c) => c.id);
  const [childId, setChildId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("childId") ?? "";
    setChildId(stored || children[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.children]);

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      await api.setupIntent();
      const r = await api.createMicroSub({
        studentId: childId,
        subjectId: 1,
        boardTrack: "AQA_8462",
      });
      setResult(asRecord(r));
    } catch (e) {
      if (isForbidden(e)) setForbidden(true);
      else if (e instanceof ApiError && e.status === 501) setError("Single-subject plans aren't available yet.");
      else setError(errorMessage(e, "Purchase failed"));
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
      <PageHeader
        title="Single-subject plan"
        description="One subject on one exam board for one child. Card details go to Stripe only — we never store the card number."
      />

      {forbidden ? (
        <ForbiddenState body="Single-subject plans are bought from the parent account." />
      ) : (
        <div className="space-y-4" aria-live="polite">
          <Card>
            <CardHeader title="Single subject · AQA 8462 track" description="Adaptive practice, marking and tutor help for one subject. The price is shown on your receipt." />
            <CardBody className="space-y-4">
              {children.length > 1 ? (
                <Field label="Child" htmlFor="micro-child">
                  <Select id="micro-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : children.length === 1 ? (
                <p className="text-[14px] text-neutral-700">
                  For <strong>{children[0].name}</strong>
                </p>
              ) : null}
              {!childId && (
                <Callout tone="warning">
                  Add a child first.{" "}
                  <Link href="/parent/children/new" className="font-semibold underline">
                    Add a child
                  </Link>
                </Callout>
              )}
              {error && <Callout tone="danger">{error}</Callout>}
              <Button disabled={!childId} loading={busy} onClick={purchase}>
                Buy single-subject plan
              </Button>
            </CardBody>
          </Card>

          {result && (
            <Callout tone="success" title="Single-subject plan active">
              <KeyValue
                className="mt-2"
                items={[
                  ["Status", humanise(result.status)],
                  ["Price", formatPence(result.amountPence, str(result.currency) ?? "GBP")],
                  ["Expires", formatDate(result.expiresAt)],
                ]}
              />
            </Callout>
          )}
        </div>
      )}
    </AppPage>
  );
}
