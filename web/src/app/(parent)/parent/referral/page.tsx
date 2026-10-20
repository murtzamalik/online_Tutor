"use client";

import { FormEvent, useState } from "react";
import { Copy, Gift } from "@phosphor-icons/react";
import * as api from "@/lib/api/w4";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Field, Input, PageHeader, StatTile } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatPence, humanise, str } from "@/components/parent/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** C-07 Referral — no dark patterns */
export default function ReferralPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const { state, retry, setData } = useLoad(
    async () => {
      try {
        return asRecord(await api.getReferral());
      } catch (e) {
        // 501 FEATURE_DISABLED: referrals are switched off for this environment.
        if (e instanceof ApiError && e.status === 501) {
          setDisabled(true);
          return {} as Record<string, unknown>;
        }
        throw e;
      }
    },
    [],
    "Could not load referral",
  );

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setInviteError("Enter a valid email address, like name@example.com.");
      return;
    }
    setBusy(true);
    setInviteError(null);
    setInviteNote(null);
    try {
      const r = asRecord(await api.inviteReferral(email));
      setData(r);
      setInviteNote(str(r.message) ?? `Invite recorded for ${email}.`);
      setEmail("");
    } catch (err) {
      setInviteError(errorMessage(err, "Invite failed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <AppPage width="content">
      <PageHeader
        title="Refer a family"
        description="You get a reward only after the family you invite pays their first invoice — never for sign-up alone."
      />
      {state.status === "loading" && <LoadingState />}
      {state.status === "forbidden" && <ForbiddenState body="Referrals are available to parent accounts." />}
      {state.status === "error" && (
        <ErrorState
          body={state.message}
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      )}
      {state.status === "ready" &&
        (disabled ? (
          <EmptyState title="Referrals aren't open yet" body="We'll let you know when you can invite other families." />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Your code</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="tabular text-[24px] font-semibold leading-none tracking-wider text-neutral-900">
                    {str(state.data.code) ?? "—"}
                  </p>
                  {str(state.data.code) && (
                    <Button
                      variant="tertiary"
                      size="sm"
                      aria-label="Copy referral code"
                      icon={<Copy size={16} aria-hidden />}
                      onClick={() => copy(String(state.data.code))}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </div>
              </Card>
              <StatTile
                label="Reward"
                icon={<Gift size={18} aria-hidden />}
                value={state.data.rewardPence != null ? formatPence(state.data.rewardPence) : "—"}
                hint={state.data.status ? `Status: ${humanise(state.data.status)}` : undefined}
              />
            </div>
            {str(state.data.note) && <Callout tone="neutral">{str(state.data.note)}</Callout>}

            <Card>
              <CardHeader title="Invite by email" description="We record the invite against your code. The reward applies only after their first paid invoice." />
              <CardBody>
                <form onSubmit={invite} className="flex flex-wrap items-start gap-3" noValidate>
                  <Field label="Invitee email" htmlFor="ref-email" error={inviteError ?? undefined} className="min-w-[16rem] flex-1">
                    <Input
                      id="ref-email"
                      type="email"
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!inviteError || undefined}
                    />
                  </Field>
                  <Button type="submit" loading={busy} className="sm:mt-[26px]">
                    Send invite
                  </Button>
                </form>
                <div aria-live="polite" className="mt-3">
                  {inviteNote && <Callout tone="success">{inviteNote}</Callout>}
                </div>
              </CardBody>
            </Card>
          </div>
        ))}
    </AppPage>
  );
}
