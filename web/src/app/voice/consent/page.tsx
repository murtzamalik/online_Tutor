"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Microphone, WarningCircle, WifiHigh, Cpu } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { errorText, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import { listStudents } from "@/lib/api/students";
import { connectivityCheck, grantVoiceConsent } from "@/lib/api/w2";

type Child = { studentId: string; displayName: string };
type Check = { micOk: boolean; networkOk: boolean; gatewayReachable: boolean; errorClass: string };

const ERROR_COPY: Record<string, string> = {
  GATEWAY_UNAVAILABLE: "The voice service is busy right now. Consent still saves; voice may not connect until it’s back.",
};

/** J-06 — Parent grants voice consent (audio processed by Google Speech via our AI gateway only after consent). */
export default function VoiceConsentPage() {
  const [students, setStudents] = useState<Child[]>([]);
  const [check, setCheck] = useState<Check | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailure(null);
    setCheck(null);
    Promise.all([listStudents(), connectivityCheck()])
      .then(([s, c]) => {
        setStudents(s.items.map((k) => ({ studentId: k.studentId, displayName: k.displayName })));
        const o = isRecord(c) ? c : {};
        setCheck({
          micOk: o.micOk === true,
          networkOk: o.networkOk === true,
          gatewayReachable: o.gatewayReachable === true,
          errorClass: str(o.errorClass),
        });
      })
      .catch((e: unknown) => setFailure(toFailure(e, "Could not load voice consent")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function grant(child: Child) {
    setBusy(child.studentId);
    setGrantError(null);
    try {
      await grantVoiceConsent(child.studentId);
      setGranted((g) => ({ ...g, [child.studentId]: true }));
    } catch (e) {
      setGrantError(errorText(e, `Couldn't save consent for ${child.displayName}.`));
    } finally {
      setBusy(null);
    }
  }

  const checks: Array<{ ok: boolean; label: string; Icon: typeof Microphone }> = check
    ? [
        { ok: check.micOk, label: "Microphone", Icon: Microphone },
        { ok: check.networkOk, label: "Network", Icon: WifiHigh },
        { ok: check.gatewayReachable, label: "Voice service", Icon: Cpu },
      ]
    : [];

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Parent controls"
        title="Voice tutor consent"
        description="Spoken sessions send your child’s audio to Google Speech through our AI gateway. Nothing is recorded or processed until you agree."
      />

      {failure ? (
        <FailureView failure={failure} onRetry={load} forbiddenBody="Only a parent can give voice consent." />
      ) : !check ? (
        <LoadingState lines={4} />
      ) : (
        <div className="animate-rise space-y-6">
          <Card>
            <CardHeader title="Connection check" />
            <ul className="grid gap-3 p-5 sm:grid-cols-3">
              {checks.map(({ ok, label, Icon }) => (
                <li key={label} className="flex items-center gap-3 rounded-md border border-neutral-200 px-3 py-2.5">
                  <Icon size={20} className="text-neutral-600" aria-hidden />
                  <span className="flex-1 text-[14px] font-medium text-neutral-900">{label}</span>
                  {ok ? (
                    <CheckCircle size={20} weight="fill" className="text-answer-correct" aria-label="OK" />
                  ) : (
                    <WarningCircle size={20} weight="fill" className="text-answer-partial" aria-label="Not available" />
                  )}
                </li>
              ))}
            </ul>
            {check.errorClass && (
              <div className="px-5 pb-5">
                <Callout tone="warning" title="Voice is running in a limited mode">
                  {ERROR_COPY[check.errorClass] ?? `Degraded: ${check.errorClass}`}
                </Callout>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Your children" description="Consent applies per child and can be withdrawn in their privacy settings." />
            {students.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No children yet" body="Add a child profile first, then come back to give voice consent." />
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {students.map((s) => (
                  <li key={s.studentId} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <span className="font-medium text-neutral-900">{s.displayName}</span>
                    {granted[s.studentId] ? (
                      <Badge tone="success">
                        <CheckCircle size={14} weight="fill" /> Consent given
                      </Badge>
                    ) : (
                      <Button size="sm" loading={busy === s.studentId} disabled={busy !== null && busy !== s.studentId} onClick={() => void grant(s)}>
                        Give consent
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {grantError && <Callout tone="danger">{grantError}</Callout>}

          <p role="status" aria-live="polite" className="text-[14px] text-neutral-600">
            {Object.keys(granted).length > 0 ? "Saved. Your child can now start a voice session from their tutor page." : ""}
          </p>
        </div>
      )}
    </AppPage>
  );
}
