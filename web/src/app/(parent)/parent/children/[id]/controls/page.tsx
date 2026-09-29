"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { getAiControls, getTranscripts, putAiControls } from "@/lib/api/w2";

/** H-09 */
export default function ControlsPage() {
  const { id } = useParams<{ id: string }>();
  const [controls, setControls] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([getAiControls(id), getTranscripts(id)])
      .then(([c, t]) => { setControls(c); setTranscripts(t.items); })
      .catch(() => setError("Could not load controls"));
  }, [id]);
  if (!controls && !error) return <div className="p-10"><LoadingState /></div>;
  if (error) return <div className="p-10"><ErrorState body={error} /></div>;
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">AI controls & transcripts</h1>
        <label className="mt-6 flex items-center gap-2"><input type="checkbox" checked={!!controls.chatEnabled} onChange={(e) => putAiControls(id, { chatEnabled: e.target.checked }).then(setControls)} /> Chat tutor</label>
        <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={!!controls.voiceEnabled} onChange={(e) => putAiControls(id, { voiceEnabled: e.target.checked }).then(setControls).catch((err) => setError(String(err.message || err)))} /> Voice tutor</label>
        <h2 className="mt-8 font-display text-2xl">Recent sessions</h2>
        <ul className="mt-3 space-y-2">{transcripts.map((t) => <li key={t.tutorSessionId} className="rounded border p-3 text-sm">{t.channel} · {t.status} · {String(t.startedAt)}</li>)}</ul>
      </main>
    </div>
  );
}
