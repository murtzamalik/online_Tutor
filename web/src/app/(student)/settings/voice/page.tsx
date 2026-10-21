"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Microphone, XCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, PageHeader } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { errorText } from "@/components/student/studentData";
import { voiceStatus } from "@/lib/api/w2";

type Status = { consentGiven: boolean; parentEnabled: boolean; available: boolean };

/**
 * J-01/J-06 — Voice settings for the learner: whether voice is ready (parent consent + setting) and a
 * microphone test that stays on this device (nothing is sent anywhere).
 */
export default function VoiceSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<"idle" | "recording" | "playing">("idle");
  const [micNote, setMicNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceStatus()
      .then(setStatus)
      .catch((e) => setError(errorText(e, "Couldn't check your voice settings.")));
  }, []);

  async function micTest() {
    setMicNote(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicNote("Your browser blocked the microphone. Allow it in the address bar, then try again.");
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
      const audio = new Audio(url);
      audioRef.current = audio;
      setTesting("playing");
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTesting("idle");
        setMicNote("If you heard yourself, your microphone works.");
      };
      void audio.play().catch(() => setTesting("idle"));
    };
    rec.start();
    setTesting("recording");
    window.setTimeout(() => rec.state === "recording" && rec.stop(), 3000);
  }

  const Row = ({ ok, label, help }: { ok: boolean; label: string; help: string }) => (
    <li className="flex items-start gap-3 py-2">
      {ok ? <CheckCircle size={22} weight="fill" className="text-answer-correct" /> : <XCircle size={22} weight="fill" className="text-neutral-400" />}
      <span>
        <span className="font-semibold text-neutral-900">{label}</span>
        {!ok && <span className="block text-[14px] text-neutral-600">{help}</span>}
      </span>
    </li>
  );

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Settings" title="Voice" description="Talk to your tutor out loud instead of typing." />
      {error ? (
        <Callout tone="danger">{error}</Callout>
      ) : !status ? (
        <LoadingState label="Checking voice…" />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Is voice ready?" />
            <CardBody>
              <ul className="divide-y divide-neutral-100">
                <Row ok={status.consentGiven} label="Parent consent" help="A parent needs to agree to voice in their Study Loop account (AI controls)." />
                <Row ok={status.parentEnabled} label="Voice switched on" help="A parent needs to switch on the voice tutor for you." />
              </ul>
              <div className="mt-4">
                {status.available ? (
                  <ButtonLink href="/voice/new" icon={<Microphone size={18} />}>
                    Start a voice session
                  </ButtonLink>
                ) : (
                  <p className="text-[14px] text-neutral-600">You can still type to your tutor while voice is off.</p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Test your microphone" description="Records 3 seconds and plays it back. It stays on this device." />
            <CardBody className="space-y-3">
              <Button variant="secondary" onClick={() => void micTest()} disabled={testing !== "idle"} icon={<Microphone size={18} />}>
                {testing === "recording" ? "Recording… speak now" : testing === "playing" ? "Playing back…" : "Test microphone"}
              </Button>
              {micNote && <p className="text-[14px] text-neutral-700" aria-live="polite">{micNote}</p>}
            </CardBody>
          </Card>

          <p className="text-caption text-neutral-600">
            When you use voice, your speech is turned into text by Google and is not kept. What you and the tutor say is saved as text for 30 days so your parent can see it.
          </p>
        </div>
      )}
    </AppPage>
  );
}
