"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, ChatsCircle, Exam, ShieldCheck, Sparkle, XCircle } from "@phosphor-icons/react";
import { listQualifications } from "@/lib/api/catalog";
import { answerSampleQuestion, getSampleQuestion, listOutcomes, schoolDemoRequest } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { PublicFrame } from "@/components/shell/PublicFrame";

type Sample = { questionId: string | number; questionText: string; optionsJson?: string | null };

/** A-01 — Marketing home (prototype A-01) with CAT + MKT-05/07/08/09. */
export default function MarketingHome() {
  const [qualCount, setQualCount] = useState<number | null>(null);
  const [outcomes, setOutcomes] = useState<{ label: string; valueText: string; methodologyMd: string }[]>([]);
  const [sample, setSample] = useState<Sample | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ correct: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoNote, setDemoNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    listQualifications().then((r) => setQualCount(r.items.length)).catch(() => setQualCount(null));
    listOutcomes().then((r) => setOutcomes(r.items)).catch(() => setOutcomes([]));
    getSampleQuestion().then(setSample).catch(() => setSample(null));
  }, []);

  const options: { key: string; text: string }[] = (() => {
    try {
      return sample?.optionsJson ? (JSON.parse(sample.optionsJson) as { key: string; text: string }[]) : [];
    } catch {
      return [];
    }
  })();

  async function submitSample() {
    if (!sample || !picked) return;
    setChecking(true);
    try {
      const res = await answerSampleQuestion(sample.questionId, picked);
      setVerdict(res.correct ? { correct: true, text: "Correct — full marks." } : { correct: false, text: "Not quite. Have another look at the charges." });
    } catch (err) {
      setVerdict({ correct: false, text: err instanceof ApiError ? err.message : "We couldn't check that answer just now." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <PublicFrame>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-neutral-200 bg-gradient-to-b from-brand-navySoft/60 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="animate-rise">
              <p className="text-caption font-semibold uppercase tracking-wider text-brand-teal">
                AQA · Edexcel · OCR · Eduqas · WJEC · CIE &amp; Edexcel iGCSE
              </p>
              <h1 className="mt-3 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-[48px]">
                Exam-board-accurate practice, marked the moment you submit.
              </h1>
              <p className="mt-5 max-w-xl text-body-lg text-neutral-600">
                Questions grounded in real past papers, marking that quotes the actual mark scheme, and a tutor that
                helps your child think a problem through — for GCSE, iGCSE and A-Level.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg">Start free trial</ButtonLink>
                <ButtonLink href="/try" size="lg" variant="secondary">Try a sample question</ButtonLink>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
                {[
                  ["95%+", "marking accuracy target"],
                  [qualCount != null ? String(qualCount) : "4", "qualifications live"],
                  ["7", "exam boards covered"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="sr-only">{l}</dt>
                    <dd className="tabular text-[26px] font-bold text-brand-navy">{v}</dd>
                    <dd className="text-caption text-neutral-600">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Live sample question (question card anatomy §7.2) */}
            <Card className="animate-rise p-6 shadow-raised">
              <div className="flex items-center justify-between text-caption text-neutral-600">
                <span>Chemistry · AQA 8462</span>
                <span>Q1 of 1</span>
              </div>
              {sample ? (
                <>
                  <p className="mt-4 text-body-lg font-medium text-neutral-900">{sample.questionText}</p>
                  <div className="mt-5 space-y-2" role="radiogroup" aria-label="Answer options">
                    {options.map((opt) => {
                      const selected = picked === opt.key;
                      return (
                        <button
                          key={opt.key}
                          role="radio"
                          aria-checked={selected}
                          disabled={!!verdict}
                          onClick={() => setPicked(opt.key)}
                          className={cx(
                            "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] transition-colors duration-fast",
                            selected ? "border-brand-navy bg-brand-navySoft" : "border-neutral-200 hover:border-neutral-400",
                            verdict && selected && (verdict.correct ? "border-answer-correct bg-[#E7F4EC]" : "border-answer-incorrect bg-[#FBE9E7]"),
                          )}
                        >
                          <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold", selected ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-400 text-neutral-600")}>
                            {opt.key}
                          </span>
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                  {verdict ? (
                    <div className={cx("mt-5 flex items-start gap-2 rounded-md px-4 py-3 text-[15px] animate-slide-up", verdict.correct ? "bg-[#E7F4EC] text-answer-correct" : "bg-[#FBF3DF] text-[#8A6508]")} role="status">
                      {verdict.correct ? <CheckCircle size={22} weight="fill" /> : <XCircle size={22} weight="fill" />}
                      <div>
                        <p className="font-semibold">{verdict.text}</p>
                        <button className="mt-1 text-[14px] font-medium underline" onClick={() => { setVerdict(null); setPicked(null); }}>Try again</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex justify-end">
                      <Button onClick={submitSample} disabled={!picked} loading={checking}>Submit answer</Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="skeleton h-5 w-4/5 rounded" />
                  {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-md" />)}
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Exam, title: "Marking you can check", body: "Every result shows the marks awarded and why, in the board’s own mark-scheme language — not just right or wrong." },
              { icon: ChatsCircle, title: "A tutor from day one", body: "Talk a stuck question through. The tutor asks the next good question instead of handing over the answer." },
              { icon: ShieldCheck, title: "Built for schools too", body: "Class dashboards, safeguarding-ready workflows and a UK-hosted, privacy-first design under the Children’s Code." },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                  <Icon size={22} />
                </span>
                <h2 className="mt-4 text-h2">{title}</h2>
                <p className="mt-2 text-neutral-600">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {outcomes.length > 0 && (
          <section className="border-y border-neutral-200 bg-neutral-050">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
              <Badge tone="teal"><Sparkle size={14} /> Pilot outcomes</Badge>
              <h2 className="mt-3 text-h1">Measured, not promised</h2>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {outcomes.map((o) => (
                  <Card key={o.label} className="p-6">
                    <p className="tabular text-[32px] font-bold text-brand-navy">{o.valueText}</p>
                    <p className="mt-1 font-semibold text-neutral-900">{o.label}</p>
                    <p className="mt-2 text-[14px] text-neutral-600">{o.methodologyMd}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Schools */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Card className="grid gap-8 bg-brand-navy p-8 text-white md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-h1 text-white">Bringing Study Loop to your school?</h2>
              <p className="mt-2 text-white/80">See the teacher console, class insights and our safeguarding workflow in a 20-minute demo.</p>
              <Link href="/case-studies" className="mt-4 inline-block text-[15px] font-semibold text-white underline">Read school case studies</Link>
            </div>
            <form
              className="self-center"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await schoolDemoRequest({ email: demoEmail, marketingConsent: true });
                  setDemoNote({ ok: true, text: "Thanks — we’ll be in touch within two working days." });
                  setDemoEmail("");
                } catch (err) {
                  setDemoNote({ ok: false, text: err instanceof ApiError ? err.message : "Request failed. Please try again." });
                }
              }}
            >
              <label htmlFor="demo-email" className="block text-[14px] font-semibold text-white/90">School email</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input id="demo-email" type="email" required value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} placeholder="name@school.sch.uk" />
                <button type="submit" className="h-11 shrink-0 rounded-md bg-white px-5 font-semibold text-brand-navy hover:bg-neutral-100">Request a demo</button>
              </div>
              {demoNote && <p className={cx("mt-2 text-[14px]", demoNote.ok ? "text-white" : "text-[#FFD2CC]")} role="status">{demoNote.text}</p>}
            </form>
          </Card>
        </section>
      </main>
    </PublicFrame>
  );
}
