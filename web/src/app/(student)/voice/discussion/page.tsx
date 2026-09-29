"use client";
import { useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** J-02 Verbal discussion mode — consent-gated like voice tutor */
export default function DiscussionPage() {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.startDiscussionVoice({});
      setSession(r);
    } catch (e: any) {
      setError(e?.message ?? "Voice consent / parent toggle required");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!session?.voiceSessionId) return;
    await api.endVoice(session.voiceSessionId);
    setSession({ ...session, status: "ENDED" });
  }

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Verbal discussion</h1>
        <p className="mt-2 text-sm">English Lang/Lit discussion mode. Same voice consent and safety as the voice tutor — not a Q&amp;A drill.</p>
        <p className="mt-2 text-sm">
          Need consent? <Link className="underline" href="/voice/consent">Grant voice consent (J-06)</Link>
        </p>
        {!session && (
          <button type="button" className="mt-6 rounded border px-4 py-2" onClick={start} disabled={busy}>Start discussion</button>
        )}
        {busy && <div className="mt-6"><LoadingState /></div>}
        {error && <div className="mt-6"><ErrorState body={error} /></div>}
        {session && (
          <div className="mt-6 space-y-3 animate-rise" aria-live="polite">
            <p>Mode: {session.mode}</p>
            <p className="text-sm">{session.scope}</p>
            <p className="text-sm">WS: {session.wsUrl}</p>
            {session.status !== "ENDED" && (
              <button type="button" className="rounded border px-3 py-2" onClick={end}>End session</button>
            )}
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Home</Link></p>
      </main>
    </div>
  );
}
