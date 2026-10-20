"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, EnvelopeSimple, LockSimple } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Field, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Markdown } from "@/components/marketing/Markdown";
import { humanise } from "@/components/marketing/format";
import { captureLead, listResources } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";

type Resource = {
  resourceId: string | number;
  title: string;
  kind?: string;
  bodyMd?: string | null;
  emailGated: boolean;
};

/** A-05 — Lead magnet / resource */
export default function ResourcePage() {
  const params = useParams<{ slug: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setResource(null);
    setNotFound(false);
    setError(null);
    let slug = params.slug;
    try {
      slug = decodeURIComponent(params.slug);
    } catch {
      /* keep the raw segment */
    }
    listResources()
      .then((r) => {
        const match = r.items.find((i) => i.slug === slug) || r.items.find((i) => String(i.resourceId) === slug);
        if (!match) {
          setNotFound(true);
          return;
        }
        setResource(match);
        if (!match.emailGated) setUnlocked(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load resource"));
  }, [params.slug]);

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    if (!resource) return;
    setBusy(true);
    setFormError(null);
    try {
      await captureLead({
        email,
        resourceId: resource.resourceId,
        sourcePage: `/resources/${params.slug}`,
        marketingConsent: true,
      });
      setUnlocked(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "We couldn't send that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicFrame>
      <main className="mx-auto max-w-reading px-4 py-10 sm:px-6 lg:py-14">
        <Link href="/library" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-navy hover:underline">
          <ArrowLeft size={16} /> Resource library
        </Link>

        <div className="mt-6" aria-live="polite">
          {!resource && !error && !notFound && <LoadingState label="Loading resource…" lines={6} />}
          {error && <ErrorState title="This resource didn't load" body={`${error}. Refresh the page to try again.`} />}
          {notFound && (
            <EmptyState
              title="Resource not found"
              body="It may have been moved or retired. Browse the library for everything that's available."
              action={<ButtonLink href="/library" variant="secondary">Browse the library</ButtonLink>}
            />
          )}

          {resource && (
            <div className="grid animate-rise gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {resource.kind && <Badge tone="brand">{humanise(resource.kind)}</Badge>}
                  {resource.emailGated && (
                    <Badge tone="teal">
                      <LockSimple size={12} weight="bold" /> Free with email
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-tight text-neutral-900 sm:text-[38px]">{resource.title}</h1>
                {resource.bodyMd ? (
                  <Markdown source={resource.bodyMd} skipFirstH1 className="mt-6" />
                ) : (
                  <p className="mt-6 text-neutral-600">A free Study Loop resource.</p>
                )}
              </article>

              {resource.emailGated && (
                <aside>
                  <Card className="p-6 shadow-raised lg:sticky lg:top-24">
                    {unlocked ? (
                      <div role="status">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F4EC] text-answer-correct">
                          <CheckCircle size={22} weight="fill" />
                        </span>
                        <h2 className="mt-4 text-[17px] font-semibold text-neutral-900">Check your inbox</h2>
                        <p className="mt-1 text-[15px] text-neutral-600">
                          Thanks — your download is on its way to <span className="font-semibold text-neutral-900">{email || "your inbox"}</span>.
                        </p>
                        <ButtonLink href="/try" variant="secondary" className="mt-5 w-full">
                          Try a sample question
                        </ButtonLink>
                      </div>
                    ) : (
                      <form onSubmit={onUnlock} className="space-y-4">
                        <div>
                          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                            <EnvelopeSimple size={20} />
                          </span>
                          <h2 className="mt-4 text-[17px] font-semibold text-neutral-900">Get the free download</h2>
                          <p className="mt-1 text-[15px] text-neutral-600">We&apos;ll email you the link. Unsubscribe any time.</p>
                        </div>
                        <Field label="Email address" htmlFor="res-email">
                          <Input
                            id="res-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                        </Field>
                        {formError && <Callout tone="danger">{formError}</Callout>}
                        <Button type="submit" className="w-full" loading={busy}>
                          Email me the download
                        </Button>
                        <p className="text-caption text-neutral-600">
                          See our <Link href="/legal/privacy" className="font-medium text-brand-navy underline">privacy policy</Link>.
                        </p>
                      </form>
                    )}
                  </Card>
                </aside>
              )}
            </div>
          )}
        </div>
      </main>
    </PublicFrame>
  );
}
