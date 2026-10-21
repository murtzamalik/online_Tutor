"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Microphone, ShieldCheck, SpeakerHigh, Stop } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { ForbiddenState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { errorText, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import { endVoice, startVoice, voiceFallbackToText, voiceTurn } from "@/lib/api/w2";

type VoiceSession = { voiceSessionId: string; tutorSessionId: string | null };
type Phase = "idle" | "recording" | "thinking" | "speaking";
type Line = { who: "you" | "tutor"; text: string };

/** Longest single turn; recording stops on its own after this. */
const MAX_TURN_MS = 55_000;

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * J-01 — Voice tutor. `/voice/new` starts a session (needs parent consent and the voice setting).
 * Tap to talk, tap again to send: the answer is transcribed, goes through the same safety checks as
 * chat, and the tutor's reply is spoken back. Audio is never stored.
 */
export default function VoiceSessionPage() {
  const { voiceSessionId } = useParams<{ voiceSessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const started = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const recordStart = useRef(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (voiceSessionId === "demo" || voiceSessionId === "new") {
      startVoice()
        .then((r: unknown) => {
          const id = isRecord(r) ? str(r.voiceSessionId) : "";
          setSession({ voiceSessionId: id, tutorSessionId: isRecord(r) ? str(r.tutorSessionId) || null : null });
          router.replace(`/voice/${id}`);
        })
        .catch((e: unknown) => setFailure(toFailure(e, "Voice could not start")));
    } else {
      setSession({ voiceSessionId, tutorSessionId: null });
    }
  }, [voiceSessionId, router]);

  // Release the microphone and any playing audio when leaving the page.
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      player.current?.pause();
    },
    [],
  );

  async function startRecording() {
    setNote(null);
    player.current?.pause();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNote("We can't use your microphone. Allow microphone access in your browser, or switch to typing.");
      return;
    }
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void send(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
    };
    recorder.current = rec;
    rec.start();
    recordStart.current = Date.now();
    setPhase("recording");
    timer.current = window.setTimeout(() => stopRecording(), MAX_TURN_MS);
  }

  function stopRecording() {
    if (timer.current) window.clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function send(blob: Blob) {
    if (!session) return;
    if (blob.size < 2_000) {
      setPhase("idle");
      setNote("That was very short. Tap the microphone, say your question, then tap again to send.");
      return;
    }
    setPhase("thinking");
    try {
      const r = await voiceTurn(session.voiceSessionId, await blobToBase64(blob), blob.type || "audio/webm", Date.now() - recordStart.current);
      if (!r.heard || !r.transcript) {
        setPhase("idle");
        setNote("We didn't catch any words. Try again a little closer to the microphone.");
        return;
      }
      setLines((l) => [...l, { who: "you", text: r.transcript ?? "" }, { who: "tutor", text: r.replyText ?? "" }]);
      if (r.audioBase64) {
        const audio = new Audio(`data:${r.mimeType ?? "audio/wav"};base64,${r.audioBase64}`);
        player.current = audio;
        audio.onended = () => setPhase("idle");
        audio.onerror = () => setPhase("idle");
        setPhase("speaking");
        await audio.play().catch(() => setPhase("idle"));
      } else {
        setPhase("idle");
        if (r.ttsFailed) setNote("The tutor's voice isn't available for this reply, so it's shown as text.");
      }
    } catch (e) {
      setPhase("idle");
      setNote(errorText(e, "Something went wrong with that turn. Try again, or switch to typing."));
    }
  }

  async function switchToTyping() {
    if (session) {
      try {
        const r = await voiceFallbackToText(session.voiceSessionId);
        const tutorId = isRecord(r) ? str(r.tutorSessionId) : "";
        router.push(tutorId ? `/tutor/${tutorId}` : "/tutor");
        return;
      } catch {
        /* fall through to a fresh chat */
      }
    }
    router.push("/tutor");
  }

  async function end() {
    if (!session) return;
    stopRecording();
    player.current?.pause();
    setEnding(true);
    try {
      await endVoice(session.voiceSessionId);
      router.push("/home");
    } catch (e) {
      setNote(errorText(e, "Couldn't end the session. Try again."));
      setEnding(false);
    }
  }

  const busy = phase === "thinking";
  const statusText = {
    idle: "Tap the microphone and ask your question",
    recording: "Listening… tap again to send",
    thinking: "Thinking…",
    speaking: "Your tutor is talking",
  }[phase];

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Tutor · Voice" title="Voice tutor" description="Talk a question through out loud. Your tutor listens and asks the next good question." />

      {failure ? (
        failure.kind === "forbidden" ? (
          <ForbiddenState body="Voice needs a parent's consent and the voice setting switched on. Ask your parent to turn it on in Study Loop." />
        ) : (
          <FailureView failure={failure} />
        )
      ) : !session ? (
        <LoadingState label="Starting voice…" />
      ) : (
        <div className="space-y-5">
          <Card className="p-6 text-center sm:p-10">
            <button
              type="button"
              onClick={() => (phase === "recording" ? stopRecording() : startRecording())}
              disabled={busy || ending}
              aria-pressed={phase === "recording"}
              aria-label={phase === "recording" ? "Stop and send" : "Start talking"}
              className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-raised transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:opacity-50 ${
                phase === "recording" ? "animate-pulse bg-answer-incorrect" : "bg-brand-teal hover:brightness-110"
              }`}
            >
              {phase === "recording" ? <Stop size={38} weight="fill" /> : phase === "speaking" ? <SpeakerHigh size={38} weight="fill" /> : <Microphone size={38} weight="fill" />}
            </button>
            <div className="mt-5 flex justify-center">
              <Badge tone={phase === "recording" ? "danger" : "teal"}>{phase === "recording" ? "Recording" : "Session open"}</Badge>
            </div>
            <p className="mt-3 text-h3" aria-live="polite">
              {statusText}
            </p>
            {note && (
              <Callout tone="warning" className="mt-5 text-left">
                {note}
              </Callout>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={end} loading={ending}>
                End session
              </Button>
              <Button variant="tertiary" onClick={() => void switchToTyping()}>
                Switch to typing
              </Button>
            </div>
          </Card>

          {lines.length > 0 && (
            <Card className="p-5">
              <h2 className="text-h3">Conversation</h2>
              <ol className="mt-3 space-y-3" aria-live="polite">
                {lines.map((l, i) => (
                  <li key={i} className={l.who === "you" ? "text-right" : ""}>
                    <span className="block text-caption font-semibold uppercase tracking-wide text-neutral-600">{l.who === "you" ? "You" : "Tutor"}</span>
                    <span className={`mt-1 inline-block max-w-[85%] rounded-lg px-3 py-2 text-left ${l.who === "you" ? "bg-brand-navy text-white" : "bg-neutral-100 text-neutral-900"}`}>{l.text}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-caption text-neutral-600">
        <ShieldCheck size={16} aria-hidden /> Your voice is turned into text by Google and not kept. Sessions follow your parent’s voice settings.
      </p>
      <p className="mt-2 text-center text-caption">
        <Link href="/settings/voice" className="font-semibold text-brand-navy hover:underline">
          Voice settings
        </Link>
      </p>
    </AppPage>
  );
}
