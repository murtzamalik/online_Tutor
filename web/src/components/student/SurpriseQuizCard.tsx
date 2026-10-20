"use client";

import { useEffect, useState } from "react";
import { Lightning, X } from "@phosphor-icons/react";
import * as api from "@/lib/api/w3";
import { ButtonLink } from "@/components/ui/Button";
import { isRecord, readToken, str } from "./studentData";

/**
 * G-01 surprise check prompt for Home (replaces the floating SurpriseQuizOverlay styling).
 * "Start" opens /surprise, which starts the 2-question session and completes the quiz;
 * "Not now" skips it via POST /surprise-quizzes/{id}/complete { skipped: true }.
 */
export function SurpriseQuizCard({ studentId }: { studentId: string }) {
  const [quiz, setQuiz] = useState<{ quizId: string; prompt: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .surpriseQuiz(studentId, readToken())
      .then((q: unknown) => {
        if (isRecord(q) && q.quizId) setQuiz({ quizId: str(q.quizId), prompt: str(q.prompt, "Quick 2-question check — ready?") });
        else setQuiz(null);
      })
      .catch(() => setQuiz(null));
  }, [studentId]);

  if (!quiz) return null;

  async function skip() {
    if (!quiz) return;
    setBusy(true);
    try {
      await api.completeSurprise(quiz.quizId, { skipped: true }, readToken());
    } catch {
      /* hiding the prompt is enough; it may come back later */
    } finally {
      setQuiz(null);
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Surprise check"
      className="animate-slide-up flex flex-wrap items-center gap-4 rounded-lg border border-brand-teal/30 bg-brand-tealSoft px-5 py-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-teal">
        <Lightning size={20} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">Surprise check</p>
        <p className="text-[14px] text-neutral-700">{quiz.prompt}</p>
      </div>
      <div className="flex items-center gap-2">
        <ButtonLink href="/surprise" variant="secondary" size="sm">
          Start
        </ButtonLink>
        <button
          type="button"
          onClick={skip}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-semibold text-neutral-700 hover:bg-white/60 disabled:opacity-50"
        >
          <X size={16} aria-hidden /> Not now
        </button>
      </div>
    </section>
  );
}
