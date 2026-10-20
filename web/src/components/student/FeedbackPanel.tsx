"use client";

import { useState } from "react";
import { CheckCircle, Circle, Hourglass, MinusCircle, XCircle } from "@phosphor-icons/react";
import { disputeAnswer, getMarkScheme } from "@/lib/api/practice";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Callout, Field, Textarea } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";

export type MarkResult = {
  status: string;
  markingStatus?: string | null;
  marks?: { awarded?: number | null; available?: number | null; max?: number | null } | null;
  points?: Array<Record<string, unknown>>;
  provisional?: boolean | null;
  isCorrect?: boolean | null;
};

type SchemePoint = { id: string; marks?: number; point?: string; accept?: string[] };

/** Post-submit feedback (Design System §7.2 step 5): verdict, marks, and why — in mark-scheme language. */
export function FeedbackPanel({
  result,
  responseId,
  questionId,
  onNext,
  nextLabel = "Next question",
}: {
  result: MarkResult;
  responseId: string;
  questionId?: string | number | null;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const awarded = Number(result.marks?.awarded ?? 0);
  const available = Number(result.marks?.available ?? result.marks?.max ?? 0);
  const pending = ["IN_EXCEPTION", "IN_REVIEW", "MARKED_PROVISIONAL", "PENDING"].includes(result.markingStatus ?? "") || result.provisional === true;
  const full = available > 0 && awarded >= available;
  const none = awarded <= 0;
  const tone = pending ? "pending" : full ? "correct" : none ? "incorrect" : "partial";

  const verdict = {
    pending: { title: "Your answer is being double-checked", body: "Our markers weren’t fully sure, so an examiner will confirm this mark. You can carry on practising.", Icon: Hourglass, cls: "border-brand-navy/20 bg-brand-navySoft text-brand-navy" },
    correct: { title: "Correct — full marks", body: null, Icon: CheckCircle, cls: "border-answer-correct/30 bg-[#E7F4EC] text-answer-correct" },
    partial: { title: "Partly there", body: "You picked up some of the marks. Here’s what earned them and what was missing.", Icon: MinusCircle, cls: "border-answer-partial/40 bg-[#FBF3DF] text-[#8A6508]" },
    incorrect: { title: "Not this time", body: "Have a look at what the mark scheme was looking for.", Icon: XCircle, cls: "border-answer-incorrect/25 bg-[#FBE9E7] text-answer-incorrect" },
  }[tone];

  const points = (result.points ?? []).filter((p) => p.id !== "FLAGS");

  return (
    <section aria-live="polite" className="mt-6 animate-slide-up rounded-lg border border-neutral-200 bg-white">
      <div className={cx("flex items-start gap-3 rounded-t-lg border-b px-5 py-4", verdict.cls)}>
        <verdict.Icon size={26} weight="fill" className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[17px] font-semibold">{verdict.title}</p>
          {verdict.body && <p className="mt-0.5 text-[14px] opacity-90">{verdict.body}</p>}
        </div>
        <p className="tabular shrink-0 text-[24px] font-bold leading-none">
          {formatMark(awarded)}
          <span className="text-[16px] font-semibold opacity-70">/{available}</span>
        </p>
      </div>

      {points.length > 0 && (
        <ul className="divide-y divide-neutral-100 px-5">
          {points.map((p, i) => {
            const a = Number(p.awarded ?? 0);
            const m = Number(p.max ?? 1);
            const got = a >= m && m > 0;
            const some = a > 0 && a < m;
            const reason = typeof p.reason === "string" ? p.reason : null;
            const evidence = typeof p.evidence === "string" && p.evidence !== "local_stub" ? p.evidence : null;
            return (
              <li key={String(p.id ?? i)} className="flex gap-3 py-3.5">
                {got ? (
                  <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-answer-correct" />
                ) : some ? (
                  <MinusCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-answer-partial" />
                ) : (
                  <Circle size={20} className="mt-0.5 shrink-0 text-neutral-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-neutral-900">
                    {["NUM", "MCQ", "TOTAL"].includes(String(p.id)) ? "Your answer" : `Marking point ${String(p.id ?? i + 1)}`}{" "}
                    <span className="tabular font-normal text-neutral-600">· {formatMark(a)}/{m}</span>
                  </p>
                  {reason && <p className="mt-0.5 text-[14px] text-neutral-700">{reason}</p>}
                  {evidence && (
                    <p className="mt-1.5 border-l-2 border-neutral-200 pl-3 text-[14px] italic text-neutral-600">“{evidence}”</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FeedbackActions responseId={responseId} questionId={questionId} onNext={onNext} nextLabel={nextLabel} />
    </section>
  );
}

function FeedbackActions({
  responseId,
  questionId,
  onNext,
  nextLabel,
}: {
  responseId: string;
  questionId?: string | number | null;
  onNext?: () => void;
  nextLabel: string;
}) {
  const [scheme, setScheme] = useState<{ points: SchemePoint[]; modelAnswer?: string } | null>(null);
  const [schemeState, setSchemeState] = useState<"idle" | "loading" | "error">("idle");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [disputeState, setDisputeState] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function toggleScheme() {
    if (scheme) {
      setScheme(null);
      return;
    }
    if (questionId == null) return;
    setSchemeState("loading");
    try {
      const s = await getMarkScheme(questionId);
      let pts: SchemePoint[] = [];
      const raw = s.markingPointsJson;
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        pts = Array.isArray(parsed) ? (parsed as SchemePoint[]) : Array.isArray((parsed as { marking_points?: unknown })?.marking_points) ? ((parsed as { marking_points: SchemePoint[] }).marking_points) : [];
      } catch {
        pts = [];
      }
      setScheme({ points: pts, modelAnswer: typeof s.modelAnswer === "string" ? s.modelAnswer : undefined });
      setSchemeState("idle");
    } catch {
      setSchemeState("error");
    }
  }

  async function sendDispute() {
    setSending(true);
    try {
      await disputeAnswer(responseId, "OTHER", disputeText.trim() || "I think the mark scheme allows my answer");
      setDisputeState({ ok: true, text: "Thanks — an examiner will look at this mark. We’ll let you know the outcome." });
      setDisputeOpen(false);
    } catch (err) {
      setDisputeState({ ok: false, text: err instanceof ApiError ? err.message : "We couldn’t send that. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-neutral-200 px-5 py-4">
      {scheme && (
        <div className="mb-4 rounded-md bg-neutral-050 p-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Mark scheme</p>
          <ul className="mt-2 space-y-2">
            {scheme.points.map((p) => (
              <li key={p.id} className="text-[14px] text-neutral-800">
                <span className="font-semibold">{p.id}</span> ({p.marks ?? 1} mark{(p.marks ?? 1) === 1 ? "" : "s"}) — {p.point}
                {p.accept && p.accept.length > 0 && <span className="text-neutral-600"> · Accept: {p.accept.join("; ")}</span>}
              </li>
            ))}
          </ul>
          {scheme.modelAnswer && <p className="mt-3 text-[14px] text-neutral-700"><span className="font-semibold">Model answer:</span> {scheme.modelAnswer}</p>}
        </div>
      )}
      {schemeState === "error" && <Callout tone="danger" className="mb-4">The mark scheme couldn’t be loaded.</Callout>}

      {disputeOpen && (
        <div className="mb-4 space-y-3 rounded-md border border-neutral-200 p-4">
          <Field label="Why do you think this mark is wrong?" htmlFor="dispute-text" hint="An examiner will review your answer against the mark scheme.">
            <Textarea id="dispute-text" value={disputeText} onChange={(e) => setDisputeText(e.target.value)} placeholder="e.g. My answer says the same thing in different words." />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={sendDispute} loading={sending}>Send to an examiner</Button>
            <Button size="sm" variant="tertiary" onClick={() => setDisputeOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {disputeState && <Callout tone={disputeState.ok ? "success" : "danger"} className="mb-4">{disputeState.text}</Callout>}

      <div className="flex flex-wrap items-center gap-2">
        {onNext && <Button onClick={onNext}>{nextLabel}</Button>}
        {questionId != null && (
          <Button variant="tertiary" onClick={toggleScheme} loading={schemeState === "loading"}>
            {scheme ? "Hide mark scheme" : "See mark scheme"}
          </Button>
        )}
        {!disputeOpen && !disputeState?.ok && (
          <Button variant="tertiary" onClick={() => setDisputeOpen(true)}>Disagree with this mark</Button>
        )}
      </div>
    </div>
  );
}

function formatMark(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
