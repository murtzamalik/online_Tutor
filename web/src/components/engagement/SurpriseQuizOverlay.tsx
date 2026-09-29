"use client";
import { useEffect, useState } from "react";
import * as api from "@/lib/api/w3";

/** G-01 overlay */
export function SurpriseQuizOverlay({ studentId }: { studentId: string }) {
  const [quiz, setQuiz] = useState<any>(null);
  useEffect(() => {
    const token = sessionStorage.getItem("accessToken") ?? undefined;
    api.surpriseQuiz(studentId, token).then(setQuiz).catch(() => setQuiz(null));
  }, [studentId]);
  if (!quiz?.quizId) return null;
  return (
    <div role="dialog" aria-label="Surprise quiz" className="fixed bottom-4 right-4 max-w-sm rounded border bg-white p-4 shadow">
      <p className="font-display text-lg">Surprise check</p>
      <p className="text-sm text-ink/70">{quiz.prompt ?? "Quick quiz ready"}</p>
      <button type="button" className="mt-2 rounded border px-2 py-1" onClick={() => {
        const token = sessionStorage.getItem("accessToken") ?? undefined;
        api.completeSurprise(quiz.quizId, {}, token).then(() => setQuiz(null));
      }}>Start</button>
      <button type="button" className="mt-2 ml-2 text-sm underline" onClick={() => {
        const token = sessionStorage.getItem("accessToken") ?? undefined;
        api.completeSurprise(quiz.quizId, { skipped: true }, token).then(() => setQuiz(null));
      }}>Not now</button>
    </div>
  );
}
