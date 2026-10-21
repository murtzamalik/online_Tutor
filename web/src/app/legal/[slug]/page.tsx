"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Cookie, FileText } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card } from "@/components/ui/primitives";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { Markdown, headingId, parseMarkdown } from "@/components/marketing/Markdown";
import { formatDate } from "@/components/marketing/format";
import { getLegal, postCookieConsent } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { usePageTitle } from "@/lib/usePageTitle";

type LegalDoc = { title: string; bodyMd: string; version: string; publishedAt?: string | null };

const LEGAL_LINKS: Array<[string, string]> = [
  ["terms", "Terms of Service"],
  ["privacy", "Privacy Policy"],
  ["cookies", "Cookie Policy"],
  ["ai-data", "AI and your data"],
];

/** Short or legacy slugs that should open a canonical document. */
const SLUG_ALIASES: Record<string, string> = { ai: "ai-data" };

/** Shell-10 — Legal document + cookie banner hook */
export default function LegalPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const alias = SLUG_ALIASES[params.slug];
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  usePageTitle(doc?.title ?? "Legal");
  const [error, setError] = useState<string | null>(null);
  const [cookieNote, setCookieNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingCookies, setSavingCookies] = useState<"all" | "essential" | null>(null);
  const [currentChoice, setCurrentChoice] = useState<string | null>(null);

  useEffect(() => {
    if (alias) {
      router.replace(`/legal/${alias}`);
      return;
    }
    setDoc(null);
    setError(null);
    getLegal(params.slug)
      .then((d) => setDoc(d))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Document not found"));
  }, [params.slug, alias, router]);

  useEffect(() => {
    try {
      setCurrentChoice(localStorage.getItem("cookieConsent"));
    } catch {
      /* storage blocked */
    }
  }, []);

  const toc = useMemo(
    () =>
      doc
        ? parseMarkdown(doc.bodyMd)
            .filter((b): b is { kind: "heading"; level: number; text: string } => b.kind === "heading" && b.level === 2)
            .map((b) => ({ id: headingId(b.text), text: b.text }))
        : [],
    [doc],
  );

  async function saveCookies(analytics: boolean) {
    setSavingCookies(analytics ? "all" : "essential");
    setCookieNote(null);
    try {
      let visitorId: string | undefined;
      try {
        visitorId = localStorage.getItem("visitorId") ?? undefined;
      } catch {
        visitorId = undefined;
      }
      const res = await postCookieConsent({ essential: true, analytics }, visitorId);
      try {
        // Keep the cookie banner (PublicFrame) in sync with the choice made here.
        localStorage.setItem("visitorId", res.visitorId);
        localStorage.setItem("cookieConsent", analytics ? "all" : "essential");
      } catch {
        /* storage blocked */
      }
      setCurrentChoice(analytics ? "all" : "essential");
      setCookieNote({ ok: true, text: analytics ? "Saved — analytics cookies allowed." : "Saved — essential cookies only." });
    } catch (err) {
      setCookieNote({ ok: false, text: err instanceof ApiError ? err.message : "We couldn't save your choice. Please try again." });
    } finally {
      setSavingCookies(null);
    }
  }

  const published = formatDate(doc?.publishedAt);

  return (
    <PublicFrame>
      <main>
        <section className="border-b border-neutral-200 bg-neutral-050">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <p className="text-caption font-semibold uppercase tracking-wider text-brand-teal">Legal</p>
            {doc ? (
              <>
                <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-[38px]">{doc.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-neutral-600">
                  <Badge tone="neutral">Version {doc.version}</Badge>
                  {published && <span>Published {published}</span>}
                </div>
              </>
            ) : error ? (
              <h1 className="mt-2 text-[32px] font-bold leading-tight text-neutral-900">Document unavailable</h1>
            ) : (
              <div className="mt-3 space-y-3" aria-hidden>
                <div className="skeleton h-9 w-1/2 rounded" />
                <div className="skeleton h-5 w-40 rounded" />
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
          <aside className="order-2 lg:order-1">
            <nav aria-label="Legal documents" className="lg:sticky lg:top-24">
              <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Policies</p>
              <ul className="mt-3 space-y-1">
                {LEGAL_LINKS.map(([slug, label]) => {
                  const active = slug === params.slug;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/legal/${slug}`}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-fast",
                          active ? "bg-brand-navySoft text-brand-navy" : "text-neutral-700 hover:bg-neutral-100",
                        )}
                      >
                        <FileText size={16} aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {toc.length > 1 && (
                <>
                  <p className="mt-8 text-caption font-semibold uppercase tracking-wide text-neutral-600">On this page</p>
                  <ul className="mt-3 space-y-1.5 border-l border-neutral-200">
                    {toc.map((t) => (
                      <li key={t.id}>
                        <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-3 text-[14px] text-neutral-600 hover:border-brand-navy hover:text-neutral-900">
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>
          </aside>

          <div className="order-1 min-w-0 lg:order-2" aria-live="polite">
            {!doc && !error && <LoadingState label="Loading document…" lines={8} />}
            {error && (
              <ErrorState
                title="We couldn't find that document"
                body={`${error}. Choose one of our policies from the list.`}
                action={<ButtonLink href="/legal/privacy" variant="secondary">Read the privacy policy</ButtonLink>}
              />
            )}
            {doc && (
              <article className="max-w-[72ch] animate-rise">
                <Markdown source={doc.bodyMd} skipFirstH1 />
              </article>
            )}

            {params.slug === "cookies" && (
              <Card className="mt-10 max-w-[72ch] p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                    <Cookie size={20} />
                  </span>
                  <div>
                    <h2 className="text-[17px] font-semibold text-neutral-900">Update cookie preferences</h2>
                    <p className="mt-1 text-[15px] text-neutral-600">
                      Essential cookies keep you signed in and are always on. Analytics cookies help us improve public pages — learner areas never use them.
                    </p>
                    {currentChoice && (
                      <p className="mt-2 text-[14px] text-neutral-600">
                        Current choice: <span className="font-semibold text-neutral-900">{currentChoice === "all" ? "Analytics allowed" : "Essential only"}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => saveCookies(true)} loading={savingCookies === "all"} disabled={savingCookies !== null}>
                    Accept analytics
                  </Button>
                  <Button variant="secondary" onClick={() => saveCookies(false)} loading={savingCookies === "essential"} disabled={savingCookies !== null}>
                    Essential only
                  </Button>
                </div>
                {cookieNote && (
                  <div className="mt-4" aria-live="polite">
                    <Callout tone={cookieNote.ok ? "success" : "danger"}>{cookieNote.text}</Callout>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </PublicFrame>
  );
}
