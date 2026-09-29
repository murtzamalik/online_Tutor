"use client";
import { useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** D-10 Target-grade keep-going drill */
export default function KeepGoingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [simplified, setSimplified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("enrolmentId required");
      const s = await api.startKeepGoing({ enrolmentId, plannedCount: 30 });
      setSessionId(s.sessionId);
      const next = await api.practiceNext(s.sessionId);
      setItem(next);
    } catch (e: any) {
      setError(e?.message ?? "Could not start");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!sessionId || !item) return;
    setBusy(true);
    try {
      const r = await api.practiceAnswer(sessionId, {
        questionId: item.questionId,
        answerText: answer,
      });
      setStatus(r.keepGoing);
      setAnswer("");
      if (r.keepGoing && (r.keepGoing.consistent || r.keepGoing.stopForFatigue)) {
        setItem(null);
      } else {
        setItem(await api.practiceNext(sessionId));
      }
    } catch (e: any) {
      setError(e?.message ?? "Answer failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSimplified() {
    if (!sessionId) return;
    const next = !simplified;
    await api.setPracticeMode(sessionId, { simplifiedLanguage: next });
    setSimplified(next);
  }

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Keep going</h1>
        <p className="mt-2 text-sm">Target-grade adaptive drill until consistency threshold (or fatigue stop).</p>
        {!sessionId && (
          <button type="button" className="mt-6 rounded border px-4 py-2" onClick={start} disabled={busy}>Start drill</button>
        )}
        {busy && <div className="mt-6"><LoadingState /></div>}
        {error && <div className="mt-6"><ErrorState body={error} /></div>}
        {sessionId && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={simplified} onChange={toggleSimplified} />
            Simplified language (J-05 — does not change marks)
          </label>
        )}
        {item && (
          <div className="mt-6 space-y-3 animate-rise">
            <p>{item.questionText ?? JSON.stringify(item)}</p>
            <input className="w-full rounded border px-3 py-2" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="Practice answer" />
            <button type="button" className="rounded border px-4 py-2" onClick={submit}>Submit</button>
          </div>
        )}
        {status && !status.keepGoing && (
          <div className="mt-6">
            <EmptyState
              title={status.consistent ? "Consistency reached" : "Taking a break"}
              body={status.consistent ? "Great consistency — session can stop." : "Fatigue signal — stop for now (no pressure)."}
            />
          </div>
        )}
        {status && (
          <pre className="mt-4 overflow-auto rounded border p-3 text-xs" aria-live="polite">{JSON.stringify(status, null, 2)}</pre>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/practice">Practice home</Link></p>
      </main>
    </div>
  );
}
