"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { under13Consent } from "@/lib/api/w2";
import { listStudents } from "@/lib/api/students";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Checkbox } from "@/components/ui/primitives";
import { ForbiddenState, LoadingState } from "@/components/ui/states";
import { ChildHeader, useChildName } from "@/components/parent/ChildHeader";
import { errorMessage, isForbidden } from "@/components/parent/format";

/** L-01 under-13 parental consent */
export default function Under13ConsentPage() {
  const { id } = useParams<{ id: string }>();
  const name = useChildName(id) ?? "your child";
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [needed, setNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    listStudents()
      .then((r) => {
        const child = r.items.find((c) => c.studentId === id);
        // Only under-13s need this; anything else (13+, or consent already given) shows a confirmation instead.
        setNeeded(child ? child.requiresUnder13Consent === true : true);
      })
      .catch(() => setNeeded(true));
  }, [id]);

  async function give() {
    setBusy(true);
    setError(null);
    try {
      await under13Consent(id);
      setOk(true);
    } catch (e) {
      if (isForbidden(e)) setForbidden(true);
      else setError(errorMessage(e, "Could not record consent. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppPage>
      <ChildHeader
        studentId={id}
        active="consent"
        title="Under-13 consent"
        description="UK GDPR needs a parent or guardian to agree before we process data for children under 13."
      />
      <div className="max-w-2xl space-y-4" aria-live="polite">
        {forbidden ? (
          <ForbiddenState body="Only the parent account linked to this child can give consent." />
        ) : needed === null ? (
          <LoadingState />
        ) : !needed && !ok ? (
          <Callout tone="success" title="No action needed">
            Parental consent is only needed for children under 13, and nothing is outstanding for {name}.
          </Callout>
        ) : ok ? (
          <Callout tone="success" title="Consent recorded">
            Thank you. {name.charAt(0).toUpperCase() + name.slice(1)} can now be enrolled in subjects and start practising.
            <div className="mt-3">
              <ButtonLink href={`/onboarding/subjects?studentId=${id}`} size="sm">
                Choose subjects
              </ButtonLink>
            </div>
          </Callout>
        ) : (
          <Card>
            <CardHeader title="What you are agreeing to" />
            <CardBody className="space-y-4">
              <ul className="list-disc space-y-1.5 pl-5 text-[14px] text-neutral-700">
                <li>We store {name}&apos;s answers, progress and settings to personalise practice.</li>
                <li>AI marking and tutoring never receive {name}&apos;s name or other identity details.</li>
                <li>Telemetry stays at the essential level unless you change it in Privacy.</li>
                <li>You can export or delete {name}&apos;s data at any time from Privacy.</li>
              </ul>
              <Checkbox
                label={`I am ${name}'s parent or legal guardian and I agree to this data processing.`}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {error && <Callout tone="danger">{error}</Callout>}
              <Button disabled={!confirmed} loading={busy} onClick={give}>
                I consent
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </AppPage>
  );
}
