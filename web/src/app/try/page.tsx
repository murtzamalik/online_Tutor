"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChartLineUp, ChatsCircle, CheckCircle, Exam, XCircle } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { MarketingPage } from "@/components/marketing/MarketingPage";
import { ApiError } from "@/lib/api/client";
import { answerSampleQuestion, getSampleQuestion } from "@/lib/api/marketing";

type Sample = {
  questionId: string | number;
  questionText: string;
  questionType?: string;
  optionsJson?: string | null;
  marksAvailable?: number;
};

type Verdict = { correct: boolean; text: string };

/** A-04 — Try a sample question */
export default function Page() {
  const [sample, setSample] = useState<Sample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSampleQuestion();
        if (!cancelled) setSample(s);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error && e.message ? e.message : "Could not load the sample question.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options: { key: string; text: string }[] = useMemo(() => {
    if (!sample?.optionsJson) return [];
    try {
      const parsed = JSON.parse(sample.optionsJson) as { key: string; text: string }[];
      return Array.isArray(parsed) ? parsed.filter((o) => o && typeof o.key === "string") : [];
    } catch {
      return [];
    }
  }, [sample]);

  async function submit() {
    if (!sample || !selected || busy) return;
    setBusy(true);
    setVerdict(null);
    try {
      const res = await answerSampleQuestion(sample.questionId, selected);
      setVerdict(
        res.correct
          ? { correct: true, text: `Correct — well done (${selected}).` }
          : { correct: false, text: "Not quite. Have another look and try a different option." },
      );
    } catch (err) {
      setVerdict({ correct: false, text: err instanceof ApiError ? err.message : "Could not mark that answer. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setVerdict(null);
    setSelected(null);
  }

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow="Free sample · no account needed"
        title="Try a real exam-style question"
        description="Pick an answer and submit it to see how instant marking works. Nothing you do here is saved."
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div aria-live="polite">
            {!sample && !error && (
              <Card className="p-6 shadow-raised" role="status">
                <span className="sr-only">Loading question…</span>
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="skeleton mt-5 h-5 w-4/5 rounded" />
                <div className="mt-6 space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-md" />
                  ))}
                </div>
              </Card>
            )}
            {error && (
              <ErrorState
                title="The sample question didn't load"
                body={`${error} Refresh the page, or create an account to start practising.`}
                action={<ButtonLink href="/signup" variant="secondary">Create a parent account</ButtonLink>}
              />
            )}
            {sample && (
              <Card className="animate-rise p-6 shadow-raised sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-neutral-600">
                  <span className="inline-flex items-center gap-2">
                    <Badge tone="brand">Sample</Badge>
                    {sample.questionType ? sample.questionType.replace(/_/g, " ").toLowerCase() : "Question"}
                  </span>
                  <span>
                    Q1 of 1
                    {sample.marksAvailable != null && (
                      <>
                        {" · "}
                        <span className="tabular">{sample.marksAvailable}</span> {sample.marksAvailable === 1 ? "mark" : "marks"}
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-5 text-body-lg font-medium text-neutral-900">{sample.questionText}</p>

                {options.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState title="Options unavailable" body="This sample question has no choices yet. Sign up to practise full questions." />
                  </div>
                ) : (
                  <>
                    <div className="mt-6 space-y-2" role="radiogroup" aria-label="Answer options">
                      {options.map((opt) => {
                        const isSel = selected === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            role="radio"
                            aria-checked={isSel}
                            disabled={!!verdict || busy}
                            onClick={() => setSelected(opt.key)}
                            className={cx(
                              "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] transition-colors duration-fast",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 disabled:cursor-default",
                              isSel ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 hover:border-neutral-400",
                              verdict && isSel && (verdict.correct ? "border-answer-correct bg-[#E7F4EC]" : "border-answer-incorrect bg-[#FBE9E7]"),
                            )}
                          >
                            <span
                              className={cx(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                                isSel ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-400 text-neutral-600",
                              )}
                            >
                              {opt.key}
                            </span>
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>

                    {verdict ? (
                      <div
                        role="status"
                        className={cx(
                          "mt-6 flex animate-slide-up items-start gap-3 rounded-md px-4 py-3 text-[15px]",
                          verdict.correct ? "bg-[#E7F4EC] text-answer-correct" : "bg-[#FBF3DF] text-[#8A6508]",
                        )}
                      >
                        {verdict.correct ? <CheckCircle size={22} weight="fill" className="shrink-0" /> : <XCircle size={22} weight="fill" className="shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{verdict.text}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-medium">
                            <button type="button" className="underline underline-offset-2" onClick={reset}>
                              Try again
                            </button>
                            {verdict.correct && (
                              <Link href="/signup" className="underline underline-offset-2">
                                Keep practising with a free trial
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <p className="text-caption text-neutral-600">{selected ? `You picked ${selected}.` : "Choose one answer."}</p>
                        <Button onClick={submit} disabled={!selected} loading={busy}>
                          Submit answer
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="text-[17px] font-semibold text-neutral-900">With a Study Loop account</h2>
              <ul className="mt-4 space-y-4">
                {[
                  { icon: Exam, text: "Practice questions mapped to your exam board’s specification." },
                  { icon: ChatsCircle, text: "Written answers marked against the real mark scheme, with a tutor to talk it through." },
                  { icon: ChartLineUp, text: "Progress by topic, so you know exactly what to revise next." },
                ].map(({ icon: ItemIcon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-[15px] text-neutral-700">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                      <ItemIcon size={18} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/signup" className="mt-6 w-full">
                Create a parent account
              </ButtonLink>
              <Link href="/pricing" className="mt-3 flex items-center justify-center gap-1.5 text-[14px] font-semibold text-brand-navy hover:underline">
                See plans and pricing <ArrowRight size={14} />
              </Link>
            </Card>
          </aside>
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}
