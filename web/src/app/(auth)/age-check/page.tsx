"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, IdentificationCard, XCircle } from "@phosphor-icons/react";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Checkbox } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { formatDateTime } from "@/components/marketing/format";
import { ApiError } from "@/lib/api/client";
import { ageStatus, completeAge, startAge } from "@/lib/api/w2";

/** GET /age-assurance/status → { outcome: PENDING | PASS | FAIL, recordId?, completedAt? }. */
type AgeStatus = { outcome?: string; recordId?: string; completedAt?: string | number | null };

/** L-05 */
export default function AgeCheckPage() {
  const [status, setStatus] = useState<AgeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ageStatus()
      .then((s: AgeStatus) => setStatus(s ?? { outcome: "PENDING" }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setNeedsLogin(true);
        setError("Could not load age status");
      });
  }, []);

  async function run() {
    const s = await startAge();
    await completeAge(s.recordId, true);
    setStatus(await ageStatus());
  }

  async function onComplete() {
    setBusy(true);
    setError(null);
    try {
      await run();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message || String(e) : String(e));
    } finally {
      setBusy(false);
    }
  }

  const outcome = (status?.outcome ?? "PENDING").toUpperCase();
  const passed = outcome === "PASS";
  const failed = outcome === "FAIL";
  const completed = formatDateTime(status?.completedAt);

  return (
    <AuthCard
      audience="family"
      title="Confirm you’re the parent or carer"
      description="Before you add a child, we ask the account holder to confirm they are an adult with parental responsibility."
      footer={
        <p>
          Why we ask:{" "}
          <Link href="/legal/privacy" className="font-semibold text-brand-navy hover:underline">
            privacy policy
          </Link>{" "}
          — required under the ICO Children’s Code.
        </p>
      }
    >
      <div aria-live="polite" className="space-y-5">
        {!status && !error && <LoadingState label="Checking your status…" />}

        {needsLogin && (
          <Callout tone="warning" title="Please log in first">
            Age assurance is linked to your parent account.{" "}
            <Link href="/login" className="font-semibold underline">
              Log in
            </Link>{" "}
            and come back to this page.
          </Callout>
        )}

        {status && (
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <span
                className={
                  passed
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F4EC] text-answer-correct"
                    : failed
                      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FBE9E7] text-answer-incorrect"
                      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
                }
              >
                {passed ? <CheckCircle size={24} weight="fill" /> : failed ? <XCircle size={24} weight="fill" /> : <Clock size={24} />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-neutral-900">Age assurance</p>
                  <Badge tone={passed ? "success" : failed ? "danger" : "warning"}>
                    {passed ? "Confirmed" : failed ? "Not confirmed" : "Not yet completed"}
                  </Badge>
                </div>
                <p className="mt-1 text-[14px] text-neutral-600">
                  {passed
                    ? `You’re all set${completed ? ` — confirmed ${completed}` : ""}.`
                    : failed
                      ? "This check was not passed. Contact support if you think this is wrong."
                      : "Complete the self-declared check below to continue."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {error && !needsLogin && (
          <Callout tone="danger" title="Something went wrong">
            {error}. Please try again.
          </Callout>
        )}

        {passed ? (
          <ButtonLink href="/parent" size="lg" className="w-full">
            Continue to parent home
          </ButtonLink>
        ) : (
          !needsLogin && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-brand-navySoft px-4 py-3 text-[14px] text-brand-navy">
                <IdentificationCard size={22} className="shrink-0" aria-hidden />
                <span>This is a self-declared check. Giving false information breaks our terms.</span>
              </div>
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                label="I confirm I am 18 or over and a parent or carer of the children I will add."
              />
              <Button size="lg" className="w-full" onClick={onComplete} loading={busy} disabled={!confirmed}>
                Complete self-declared check
              </Button>
            </div>
          )
        )}
      </div>
    </AuthCard>
  );
}
