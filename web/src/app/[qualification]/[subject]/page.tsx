"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BellRinging, CalendarBlank, ChatsCircle, CheckCircle, Exam, Target } from "@phosphor-icons/react";
import { captureLead, getMarketingPage } from "@/lib/api/marketing";
import { listBoards, listQualifications, listSpecifications, listSubjects } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, Input } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MarketingPage, SectionHeading } from "@/components/marketing/MarketingPage";
import { Markdown, markdownToText } from "@/components/marketing/Markdown";

type MarketingContent = {
  title: string;
  heroMd?: string | null;
  bodyMd: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

type Spec = {
  specificationId?: string | number;
  specCode: string;
  title?: string | null;
  tierScheme?: string | null;
  qualificationId?: string | number;
  boardId?: string | number;
  subjectId?: string | number;
};

type Named = { id: string; code: string; displayName: string; isPilot?: boolean };

/** "a-level" → "A_LEVEL", "chemistry" → "CHEMISTRY". */
const toCode = (s: string) => decodeSafe(s).toUpperCase().replace(/[^A-Z0-9]+/g, "_");

function decodeSafe(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** A-02 — Qualification / subject landing */
export default function SubjectLandingPage() {
  const params = useParams<{ qualification: string; subject: string }>();
  const slug = `${params.qualification}-${params.subject}`.toLowerCase();
  const [page, setPage] = useState<MarketingContent | null>(null);
  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [subjects, setSubjects] = useState<Named[]>([]);
  const [quals, setQuals] = useState<Named[]>([]);
  const [boards, setBoards] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [leadNote, setLeadNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [leadBusy, setLeadBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    setError(null);
    getMarketingPage(slug)
      .then((p) => {
        if (!cancelled) setPage(p);
      })
      .catch(async () => {
        // Fallback: try gcse-chemistry style slug from params
        try {
          const alt = await getMarketingPage(
            `${String(params.qualification).toLowerCase()}-${String(params.subject).toLowerCase()}`,
          );
          if (!cancelled) setPage(alt);
        } catch (err) {
          if (!cancelled) setError(err instanceof ApiError ? err.message : "Page not found");
        }
      });
    listSpecifications()
      .then((r) => {
        if (!cancelled) setSpecs(r.items);
      })
      .catch(() => {
        if (!cancelled) setSpecs([]);
      });
    listSubjects()
      .then((r) => {
        if (!cancelled)
          setSubjects(r.items.map((s) => ({ id: String(s.subjectId), code: s.code, displayName: s.displayName, isPilot: s.isPilot })));
      })
      .catch(() => undefined);
    listQualifications()
      .then((r) => {
        if (!cancelled) setQuals(r.items.map((q) => ({ id: String(q.qualificationId), code: q.code, displayName: q.displayName })));
      })
      .catch(() => undefined);
    listBoards()
      .then((r) => {
        if (!cancelled) setBoards(Object.fromEntries(r.items.map((b) => [String(b.boardId), b.displayName])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slug, params.qualification, params.subject]);

  const subject = subjects.find((s) => s.code === toCode(params.subject));
  const qualification = quals.find((q) => q.code === toCode(params.qualification));

  /** Specifications for this subject + qualification (all active specs if the catalogue can't be matched). */
  const tracks = useMemo(() => {
    if (!specs) return null;
    if (!subject && !qualification) return specs.slice(0, 8);
    return specs.filter(
      (s) =>
        (!subject || String(s.subjectId) === subject.id) &&
        (!qualification || String(s.qualificationId) === qualification.id),
    );
  }, [specs, subject, qualification]);

  const isOpen = subject?.isPilot === true;
  const qualLabel = qualification?.displayName ?? decodeSafe(params.qualification).toUpperCase();
  const subjectLabel = subject?.displayName ?? decodeSafe(params.subject).replace(/-/g, " ");

  async function onLead(e: FormEvent) {
    e.preventDefault();
    setLeadBusy(true);
    setLeadNote(null);
    try {
      await captureLead({
        email,
        sourcePage: `/${params.qualification}/${params.subject}`,
        marketingConsent: true,
      });
      setLeadNote({ ok: true, text: "Thanks — we will email when this track opens." });
      setEmail("");
    } catch (err) {
      setLeadNote({ ok: false, text: err instanceof ApiError ? err.message : "Could not save your email. Please try again." });
    } finally {
      setLeadBusy(false);
    }
  }

  if (!page && !error) {
    return (
      <PublicFrame>
        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <LoadingState label="Loading subject…" lines={5} />
        </main>
      </PublicFrame>
    );
  }

  if (error || !page) {
    return (
      <PublicFrame>
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <ErrorState
            title="We couldn't find that subject"
            body={`${error ?? "Page not found"}. It may not be available yet — leave your email below or try GCSE Chemistry.`}
            action={<ButtonLink href="/gcse/chemistry" variant="secondary">GCSE Chemistry</ButtonLink>}
          />
          <LeadCard email={email} setEmail={setEmail} onSubmit={onLead} busy={leadBusy} note={leadNote} className="mt-8" />
        </main>
      </PublicFrame>
    );
  }

  const cta = page.ctaHref || "/signup";
  const heroText = page.heroMd ? markdownToText(page.heroMd) : null;

  return (
    <PublicFrame>
      <MarketingPage
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            {qualLabel} · {subjectLabel}
            {subject && (isOpen ? <Badge tone="success">Open for practice</Badge> : <Badge tone="warning">Coming soon</Badge>)}
          </span>
        }
        title={page.title}
        description={heroText ?? undefined}
        actions={
          <>
            <ButtonLink href={cta} size="lg">
              {page.ctaLabel || "Start free"}
            </ButtonLink>
            <ButtonLink href="/try" size="lg" variant="secondary">
              Try a sample question
            </ButtonLink>
          </>
        }
        aside={
          <Card className="p-6 shadow-raised">
            <p className="text-caption font-semibold uppercase tracking-wide text-neutral-600">What you get</p>
            <ul className="mt-4 space-y-4">
              {[
                { icon: Target, title: "Board-accurate questions", body: "Mapped to your specification, topic by topic." },
                { icon: Exam, title: "Instant marking", body: "Marks explained in the board’s mark-scheme language." },
                { icon: ChatsCircle, title: "A tutor that helps you think", body: "Talk a stuck question through, step by step." },
              ].map(({ icon: ItemIcon, title, body }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
                    <ItemIcon size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold text-neutral-900">{title}</span>
                    <span className="block text-[14px] text-neutral-600">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        }
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="about-h">
              <SectionHeading title={<span id="about-h">About {page.title}</span>} />
              <Markdown source={page.bodyMd} skipFirstH1 />
            </section>

            <section aria-labelledby="tracks-h" aria-live="polite">
              <SectionHeading
                title={<span id="tracks-h">Exam board specifications</span>}
                description="The specifications we cover, so practice matches the exam you’ll sit."
              />
              {!tracks && <LoadingState label="Loading specifications…" lines={3} />}
              {tracks && tracks.length === 0 && (
                <EmptyState title="No specifications listed yet" body="Specifications will appear here as exam boards open for this subject." />
              )}
              {tracks && tracks.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {tracks.map((s) => (
                    <li key={String(s.specificationId ?? s.specCode)}>
                      <Card className="flex h-full items-start gap-3 p-4">
                        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-answer-correct" aria-hidden />
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900">{s.title ?? s.specCode}</p>
                          <p className="mt-0.5 text-[14px] text-neutral-600">
                            {[s.boardId != null ? boards[String(s.boardId)] : null, s.specCode, s.tierScheme ? s.tierScheme.replace(/_/g, " ").toLowerCase() : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-5">
            {isOpen ? (
              <Card className="border-2 border-brand-navy p-6">
                <h2 className="text-[17px] font-semibold text-neutral-900">Ready to start?</h2>
                <p className="mt-1 text-[15px] text-neutral-600">Create a parent account, add your child and set their exam board in minutes.</p>
                <ButtonLink href="/signup" className="mt-4 w-full">Start free trial</ButtonLink>
                <Link href="/pricing" className="mt-3 block text-center text-[14px] font-semibold text-brand-navy hover:underline">
                  See pricing
                </Link>
              </Card>
            ) : (
              <LeadCard email={email} setEmail={setEmail} onSubmit={onLead} busy={leadBusy} note={leadNote} />
            )}
            <Card className="p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-tealSoft text-brand-teal">
                <CalendarBlank size={20} />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold text-neutral-900">When are the exams?</h2>
              <p className="mt-1 text-[15px] text-neutral-600">See key dates and plan revision backwards from them.</p>
              <Link href="/exam-dates" className="mt-3 inline-block text-[15px] font-semibold text-brand-navy hover:underline">
                Exam dates
              </Link>
            </Card>
          </div>
        </div>
      </MarketingPage>
    </PublicFrame>
  );
}

function LeadCard({
  email,
  setEmail,
  onSubmit,
  busy,
  note,
  className,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  note: { ok: boolean; text: string } | null;
  className?: string;
}) {
  return (
    <Card id="lead" className={`scroll-mt-24 p-6 ${className ?? ""}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navySoft text-brand-navy">
        <BellRinging size={20} />
      </span>
      <h2 className="mt-4 text-[17px] font-semibold text-neutral-900">Coming soon — get notified</h2>
      <p className="mt-1 text-[15px] text-neutral-600">Leave an email if this subject is not yet open for practice.</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="lead-email">
          Email
        </label>
        <Input
          id="lead-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" variant="secondary" className="w-full" loading={busy}>
          Notify me
        </Button>
      </form>
      {note && (
        <div className="mt-3" aria-live="polite">
          <Callout tone={note.ok ? "success" : "danger"}>{note.text}</Callout>
        </div>
      )}
    </Card>
  );
}
