"use client";

import { useState } from "react";
import Link from "next/link";
import { Microphone, MicrophoneSlash, ShieldCheck } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { ForbiddenState } from "@/components/ui/states";
import { errorText, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w4";

type VoiceSession = { voiceSessionId: string; mode: string; scope: string; status: string };

/** J-02 Verbal discussion mode — consent-gated like voice tutor */
export default function DiscussionPage() {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setFailure(null);
    try {
      const r: unknown = await api.startDiscussionVoice({});
      if (isRecord(r)) {
        setSession({ voiceSessionId: str(r.voiceSessionId), mode: str(r.mode), scope: str(r.scope), status: str(r.status, "ACTIVE") });
      }
    } catch (e: unknown) {
      setFailure(toFailure(e, "Voice consent / parent toggle required"));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!session?.voiceSessionId) return;
    setBusy(true);
    setEndError(null);
    try {
      await api.endVoice(session.voiceSessionId);
      setSession({ ...session, status: "ENDED" });
    } catch (e) {
      setEndError(errorText(e, "Couldn't end the session. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const live = session && session.status !== "ENDED";

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Tutor · Voice"
        title="Talk it through"
        description="A spoken discussion for English Language and Literature — ideas, themes and quotes. It isn’t a question drill."
      />

      {failure?.kind === "forbidden" ? (
        <div className="space-y-4">
          <ForbiddenState body={`${failure.message}. Voice needs a parent’s consent and the voice setting switched on.`} />
          <p className="text-center text-[14px] text-neutral-600">
            Parent?{" "}
            <Link href="/voice/consent" className="font-semibold text-brand-navy hover:underline">
              Give voice consent
            </Link>
          </p>
        </div>
      ) : (
        <Card className="p-6 text-center sm:p-10">
          <span
            className={
              "mx-auto flex h-20 w-20 items-center justify-center rounded-full " +
              (live ? "bg-brand-teal text-white shadow-raised" : "bg-brand-tealSoft text-brand-teal")
            }
          >
            {session?.status === "ENDED" ? <MicrophoneSlash size={34} /> : <Microphone size={34} weight={live ? "fill" : "regular"} />}
          </span>

          {!session ? (
            <>
              <h2 className="mt-5 text-h2">Ready when you are</h2>
              <p className="mx-auto mt-1 max-w-md text-neutral-600">Find a quiet spot. Your tutor will ask questions to help you build your own argument.</p>
              {failure && (
                <Callout tone="danger" className="mt-5 text-left">
                  {failure.message}
                </Callout>
              )}
              <div className="mt-6 flex justify-center">
                <Button size="lg" onClick={start} loading={busy} icon={<Microphone size={18} />}>
                  Start discussion
                </Button>
              </div>
            </>
          ) : live ? (
            <div aria-live="polite">
              <div className="mt-5 flex justify-center">
                <Badge tone="teal">Session open</Badge>
              </div>
              <h2 className="mt-3 text-h2">You’re connected</h2>
              {session.scope && <p className="mx-auto mt-1 max-w-md text-neutral-600">{session.scope}</p>}
              {endError && (
                <Callout tone="danger" className="mt-5 text-left">
                  {endError}
                </Callout>
              )}
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" size="lg" onClick={end} loading={busy}>
                  End session
                </Button>
              </div>
            </div>
          ) : (
            <div aria-live="polite">
              <h2 className="mt-5 text-h2">Session ended</h2>
              <p className="mx-auto mt-1 max-w-md text-neutral-600">Nice work talking it through.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/home">Back to Home</ButtonLink>
                <Button variant="secondary" onClick={() => setSession(null)}>
                  Start another
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-caption text-neutral-600">
        <ShieldCheck size={16} aria-hidden /> Same consent and safety checks as the voice tutor.
      </p>
    </AppPage>
  );
}
