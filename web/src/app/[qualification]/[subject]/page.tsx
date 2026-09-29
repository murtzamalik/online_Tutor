"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { captureLead, getMarketingPage } from "@/lib/api/marketing";
import { listSpecifications, listSubjects } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** A-02 — Qualification / subject landing */
export default function SubjectLandingPage() {
  const params = useParams<{ qualification: string; subject: string }>();
  const slug = `${params.qualification}-${params.subject}`.toLowerCase();
  const [page, setPage] = useState<{
    title: string;
    heroMd?: string | null;
    bodyMd: string;
    ctaLabel?: string | null;
    ctaHref?: string | null;
  } | null>(null);
  const [specs, setSpecs] = useState<{ specCode: string; title?: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [leadNote, setLeadNote] = useState<string | null>(null);

  useEffect(() => {
    getMarketingPage(slug)
      .then(setPage)
      .catch(async () => {
        // Fallback: try gcse-chemistry style slug from params
        try {
          const alt = await getMarketingPage(
            `${String(params.qualification).toLowerCase()}-${String(params.subject).toLowerCase()}`,
          );
          setPage(alt);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Page not found");
        }
      });
    listSpecifications()
      .then((r) => setSpecs(r.items.slice(0, 8)))
      .catch(() => undefined);
    listSubjects().catch(() => undefined);
  }, [slug, params.qualification, params.subject]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {!page && !error && <LoadingState />}
      {error && <ErrorState body={error} />}
      {page && (
        <>
          <p className="text-sm uppercase tracking-wide text-ink/50">
            {params.qualification} · {params.subject}
          </p>
          <h1 className="mt-2 font-display text-4xl">{page.title}</h1>
          {page.heroMd && <p className="mt-3 text-lg text-ink/75">{page.heroMd}</p>}
          <p className="mt-6 whitespace-pre-wrap text-ink/80">{page.bodyMd}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-md bg-accent px-5 py-3 font-semibold text-white" href={page.ctaHref || "/signup"}>
              {page.ctaLabel || "Start free"}
            </Link>
            <Link className="rounded-md border border-mist px-5 py-3 font-semibold" href="/exam-dates">
              Exam dates
            </Link>
          </div>
          {specs.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl">Catalogue tracks</h2>
              <ul className="mt-3 space-y-2">
                {specs.map((s) => (
                  <li key={s.specCode} className="text-sm text-ink/80">
                    {s.specCode} — {s.title}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section id="lead" className="mt-12 border-t border-mist pt-8">
            <h2 className="font-display text-2xl">Coming soon — get notified</h2>
            <p className="mt-2 text-ink/70">Leave an email if this subject is not yet open for practice.</p>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await captureLead({
                    email,
                    sourcePage: `/${params.qualification}/${params.subject}`,
                    marketingConsent: true,
                  });
                  setLeadNote("Thanks — we will email when this track opens.");
                } catch (err) {
                  setLeadNote(err instanceof ApiError ? err.message : "Could not save lead");
                }
              }}
            >
              <label className="sr-only" htmlFor="lead-email">
                Email
              </label>
              <input
                id="lead-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-mist px-3 py-2"
                placeholder="you@example.com"
              />
              <Button type="submit">Notify me</Button>
            </form>
            {leadNote && (
              <p className="mt-2 text-sm" role="status">
                {leadNote}
              </p>
            )}
          </section>
        </>
      )}
      {!page && !error && null}
      {page === null && error === null ? null : null}
      {!page && !error ? null : specs.length === 0 && page ? (
        <div className="mt-8">
          <EmptyState title="No specs listed" body="Catalogue will populate as boards open." />
        </div>
      ) : null}
    </main>
  );
}
