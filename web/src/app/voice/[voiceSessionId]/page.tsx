"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { endVoice, startVoice } from "@/lib/api/w2";

/** J-01 */
export default function VoiceSessionPage() {
  const { voiceSessionId } = useParams<{ voiceSessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (voiceSessionId === "demo" || voiceSessionId === "new") {
      startVoice().then(setSession).catch((e) => setError(e.message || "Voice requires consent + parent toggle"));
    } else {
      setSession({ voiceSessionId, status: "ACTIVE" });
    }
  }, [voiceSessionId]);

  if (!session && !error) return <div className="p-10"><LoadingState label="Starting voice…" /></div>;
  if (error) return <div className="p-10"><ErrorState body={error} /></div>;

  return (
    <div>
      <AppNav displayName="Student" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Voice tutor</h1>
        <p className="mt-2 text-ink/70">STT/TTS via ai-gateway only. Session {session.voiceSessionId}</p>
        <p className="mt-4 text-sm">WS: {session.wsUrl ?? "—"}</p>
        <button type="button" className="mt-6 rounded border px-4 py-2" onClick={() => endVoice(session.voiceSessionId).then(() => router.push("/home"))}>End session</button>
      </main>
    </div>
  );
}
