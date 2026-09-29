"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listQualifications, listSpecifications } from "@/lib/api/catalog";
import {
  answerSampleQuestion,
  getSampleQuestion,
  listOutcomes,
  postCookieConsent,
  schoolDemoRequest,
} from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";

/** A-01 — Marketing home with CAT + MKT-05/07/08/09 + cookie CON-06 */
export default function MarketingHome() {
  const [qualCount, setQualCount] = useState<number | null>(null);
  const [pilotSpec, setPilotSpec] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<{ label: string; valueText: string; methodologyMd: string }[]>([]);
  const [sample, setSample] = useState<{
    questionId: string | number;
    questionText: string;
    optionsJson?: string | null;
  } | null>(null);
  const [sampleResult, setSampleResult] = useState<string | null>(null);
  const [demoEmail, setDemoEmail] = useState("");
  const [demoNote, setDemoNote] = useState<string | null>(null);
  const [cookieNote, setCookieNote] = useState<string | null>(null);

  useEffect(() => {
    listQualifications()
      .then((r) => setQualCount(r.items.length))
      .catch(() => setQualCount(null));
    listSpecifications()
      .then((r) => {
        const aqa = r.items.find((s) => s.specCode === "8462");
        setPilotSpec(aqa ? `${aqa.specCode} — ${aqa.title ?? "AQA GCSE Chemistry"}` : null);
      })
      .catch(() => setPilotSpec(null));
    listOutcomes()
      .then((r) => setOutcomes(r.items))
      .catch(() => setOutcomes([]));
    getSampleQuestion()
      .then(setSample)
      .catch(() => setSample(null));
  }, []);

  const options: { key: string; text: string }[] = (() => {
    if (!sample?.optionsJson) return [];
    try {
      return JSON.parse(sample.optionsJson) as { key: string; text: string }[];
    } catch {
      return [];
    }
  })();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, #d8efe8 0%, transparent 45%), radial-gradient(ellipse at 80% 0%, #f0e6d8 0%, transparent 40%), linear-gradient(180deg, #f7f4ef 0%, #eef3f0 100%)",
        }}
      />
      <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-6 py-16">
        <p className="font-display text-5xl text-ink md:text-7xl animate-rise">Study Loop</p>
        <p className="mt-4 max-w-xl text-lg text-ink/75 animate-rise">
          Adaptive practice and instant marking for UK exams — privacy-first for families and schools.
        </p>
        {qualCount != null && (
          <p className="mt-3 text-sm text-ink/60">
            Catalogue live: {qualCount} qualification{qualCount === 1 ? "" : "s"}
            {pilotSpec ? ` · Pilot track ${pilotSpec}` : ""}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-accent px-5 py-3 font-semibold text-white" href="/signup">
            Start free as a parent
          </Link>
          <Link className="rounded-md border border-mist bg-white/70 px-5 py-3 font-semibold" href="/login">
            Log in
          </Link>
          <Link className="rounded-md border border-mist bg-white/70 px-5 py-3 font-semibold" href="/gcse/chemistry">
            GCSE Chemistry
          </Link>
          <Link className="rounded-md border border-mist bg-white/40 px-5 py-3 text-sm font-semibold" href="/faq">
            FAQ
          </Link>
        </div>
      </div>

      {outcomes.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <h2 className="font-display text-2xl">Outcomes</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {outcomes.map((o) => (
              <li key={o.label} className="rounded-md border border-mist bg-white/70 p-4">
                <p className="text-3xl font-semibold text-accent">{o.valueText}</p>
                <p className="font-medium">{o.label}</p>
                <p className="mt-1 text-xs text-ink/60">{o.methodologyMd}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sample && (
        <section className="mx-auto max-w-5xl px-6 pb-12">
          <h2 className="font-display text-2xl">Try a sample question</h2>
          <p className="mt-2 text-ink/80">{sample.questionText}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((opt) => (
              <Button
                key={opt.key}
                variant="ghost"
                onClick={async () => {
                  try {
                    const res = await answerSampleQuestion(sample.questionId, opt.key);
                    setSampleResult(res.correct ? `Correct (${opt.key})` : `Not quite — try another`);
                  } catch (err) {
                    setSampleResult(err instanceof ApiError ? err.message : "Answer failed");
                  }
                }}
              >
                {opt.key}. {opt.text}
              </Button>
            ))}
          </div>
          {sampleResult && (
            <p className="mt-3 text-sm" role="status">
              {sampleResult}
            </p>
          )}
        </section>
      )}

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl">School demo</h2>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await schoolDemoRequest({ email: demoEmail, marketingConsent: true });
              setDemoNote("Request received — we will be in touch.");
            } catch (err) {
              setDemoNote(err instanceof ApiError ? err.message : "Request failed");
            }
          }}
        >
          <label className="sr-only" htmlFor="demo-email">
            School email
          </label>
          <input
            id="demo-email"
            type="email"
            required
            value={demoEmail}
            onChange={(e) => setDemoEmail(e.target.value)}
            className="rounded-md border border-mist px-3 py-2"
            placeholder="school@example.edu"
          />
          <Button type="submit">Request demo</Button>
        </form>
        {demoNote && (
          <p className="mt-2 text-sm" role="status">
            {demoNote}
          </p>
        )}
      </section>

      <div className="fixed bottom-4 right-4 z-20 max-w-sm rounded-md border border-mist bg-white p-4 shadow-sm">
        <p className="text-sm font-medium">Cookies</p>
        <p className="mt-1 text-xs text-ink/70">Essential cookies only by default. Accept analytics?</p>
        <div className="mt-3 flex gap-2">
          <Button
            onClick={async () => {
              try {
                const res = await postCookieConsent({ essential: true, analytics: true });
                localStorage.setItem("visitorId", res.visitorId);
                setCookieNote("Preferences saved");
              } catch (err) {
                setCookieNote(err instanceof ApiError ? err.message : "Failed");
              }
            }}
          >
            Accept
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                const res = await postCookieConsent({ essential: true, analytics: false });
                localStorage.setItem("visitorId", res.visitorId);
                setCookieNote("Essential only");
              } catch (err) {
                setCookieNote(err instanceof ApiError ? err.message : "Failed");
              }
            }}
          >
            Essential only
          </Button>
        </div>
        {cookieNote && (
          <p className="mt-2 text-xs" role="status">
            {cookieNote}
          </p>
        )}
        <Link className="mt-2 block text-xs underline" href="/legal/cookies">
          Cookie policy
        </Link>
      </div>
    </main>
  );
}
