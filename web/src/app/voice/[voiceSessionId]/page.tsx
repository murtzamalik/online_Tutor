"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Microphone, ShieldCheck } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { ForbiddenState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { errorText, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import { endVoice, startVoice } from "@/lib/api/w2";

type VoiceSession = { voiceSessionId: string; status: string };

/** J-01 — Voice tutor session. `/voice/demo` or `/voice/new` starts a session; any other id resumes it. */
export default function VoiceSessionPage() {
  const { voiceSessionId } = useParams<{ voiceSessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (voiceSessionId === "demo" || voiceSessionId === "new") {
      startVoice()
        .then((r: unknown) => setSession({ voiceSessionId: isRecord(r) ? str(r.voiceSessionId) : "", status: "ACTIVE" }))
        .catch((e: unknown) => setFailure(toFailure(e, "Voice requires consent + parent toggle")));
    } else {
      setSession({ voiceSessionId, status: "ACTIVE" });
    }
  }, [voiceSessionId]);

  async function end() {
    if (!session) return;
    setEnding(true);
    setEndError(null);
    try {
      await endVoice(session.voiceSessionId);
      router.push("/home");
    } catch (e) {
      setEndError(errorText(e, "Couldn't end the session. Try again."));
      setEnding(false);
    }
  }

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Tutor · Voice" title="Voice tutor" description="Talk a question through out loud. Your tutor listens and asks the next good question." />

      {failure ? (
        failure.kind === "forbidden" ? (
          <ForbiddenState body={`${failure.message}. Voice needs a parent’s consent and the voice setting switched on.`} />
        ) : (
          <FailureView failure={failure} />
        )
      ) : !session ? (
        <LoadingState label="Starting voice…" />
      ) : (
        <Card className="p-6 text-center sm:p-10" aria-live="polite">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-teal text-white shadow-raised">
            <Microphone size={34} weight="fill" />
          </span>
          <div className="mt-5 flex justify-center">
            <Badge tone="teal">Session open</Badge>
          </div>
          <h2 className="mt-3 text-h2">You’re connected</h2>
          <p className="mx-auto mt-1 max-w-md text-neutral-600">Speech goes through our AI gateway only. You can switch back to typing at any time.</p>
          {endError && (
            <Callout tone="danger" className="mt-5 text-left">
              {endError}
            </Callout>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" size="lg" onClick={end} loading={ending}>
              End session
            </Button>
          </div>
          <p className="mt-4 text-[14px]">
            <Link href="/tutor" className="font-semibold text-brand-navy hover:underline">
              Switch to typing
            </Link>
          </p>
        </Card>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-caption text-neutral-600">
        <ShieldCheck size={16} aria-hidden /> Sessions follow your parent’s voice settings.
      </p>
    </AppPage>
  );
}
