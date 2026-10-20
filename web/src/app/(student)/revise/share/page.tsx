"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cards, Copy, ShareNetwork } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Field, Input, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { errorText, formatDate, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w4";

type Deck = { deckId: string; title: string; kind: string };
type Share = { shareCode: string; deckId: string; expiresAt: string; revoked?: boolean };

/** I-06 Share deck / quiz set */
export default function ShareDeckPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [share, setShare] = useState<Share | null>(null);
  const [code, setCode] = useState("");
  const [opened, setOpened] = useState<{ title: string; deckId: string; expiresAt: string } | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyDeck, setBusyDeck] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailure(null);
    api
      .listDecks()
      .then((r) =>
        setDecks(
          (r.items ?? [])
            .filter(isRecord)
            .map((d) => ({ deckId: str(d.deckId), title: str(d.title, "Untitled deck"), kind: str(d.kind) })),
        ),
      )
      .catch((e: unknown) => setFailure(toFailure(e, "Could not load decks")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function shareDeck(deckId: string) {
    setBusyDeck(deckId);
    setActionError(null);
    setCopied(false);
    try {
      const s: unknown = await api.shareDeck(deckId, { expiresInHours: 72 });
      if (isRecord(s)) setShare({ shareCode: str(s.shareCode), deckId: str(s.deckId, deckId), expiresAt: str(s.expiresAt) });
    } catch (e) {
      setActionError(errorText(e, "Share failed"));
    } finally {
      setBusyDeck(null);
    }
  }

  async function revoke() {
    if (!share) return;
    setActionError(null);
    try {
      await api.revokeShare(share.shareCode);
      setShare({ ...share, revoked: true });
    } catch (e) {
      setActionError(errorText(e, "Couldn't stop sharing. Try again."));
    }
  }

  async function copyCode() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.shareCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function openCode() {
    const c = code.trim();
    if (!c) return;
    setOpening(true);
    setOpenError(null);
    setOpened(null);
    try {
      const o: unknown = await api.openShared(c);
      if (isRecord(o)) setOpened({ title: str(o.title, "Shared deck"), deckId: str(o.deckId), expiresAt: str(o.expiresAt) });
    } catch (e) {
      setOpenError(errorText(e, "Open failed"));
    } finally {
      setOpening(false);
    }
  }

  const ownDecks = decks.filter((d) => d.kind !== "SYSTEM");
  const shareTitle = share ? decks.find((d) => d.deckId === share.deckId)?.title : undefined;

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Flashcards"
        title="Share a deck"
        description="Share codes expire after 3 days and are checked before anyone else can see them. Under-13s need a parent’s permission to share."
        actions={<ButtonLink href="/revise" variant="tertiary" size="sm">My decks</ButtonLink>}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Your decks" />
          {loading ? (
            <CardBody>
              <LoadingState lines={3} />
            </CardBody>
          ) : failure ? (
            <CardBody>
              <FailureView failure={failure} onRetry={load} />
            </CardBody>
          ) : ownDecks.length === 0 ? (
            <CardBody>
              <EmptyState title="No decks of your own yet" body="Create a flashcard deck first, then share it here." action={<ButtonLink href="/revise/decks/new">Create a deck</ButtonLink>} />
            </CardBody>
          ) : (
            <ul className="divide-y divide-neutral-100" role="list">
              {ownDecks.map((d) => (
                <li key={d.deckId} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <Cards size={20} className="shrink-0 text-brand-navy" aria-hidden />
                    <span className="truncate font-medium text-neutral-900">{d.title}</span>
                  </span>
                  <Button variant="secondary" size="sm" icon={<ShareNetwork size={16} />} loading={busyDeck === d.deckId} onClick={() => void shareDeck(d.deckId)}>
                    Share
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {actionError && <Callout tone="danger">{actionError}</Callout>}

        {share && (
          <Card className="animate-slide-up border-brand-teal/30 p-5" aria-live="polite">
            <p className="text-caption font-semibold uppercase tracking-wide text-brand-teal">{shareTitle ? `Share code for “${shareTitle}”` : "Share code"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className={"tabular rounded-md bg-neutral-100 px-4 py-2 font-mono text-[24px] font-bold tracking-widest " + (share.revoked ? "text-neutral-400 line-through" : "text-neutral-900")}>
                {share.shareCode}
              </span>
              {!share.revoked && (
                <Button variant="tertiary" size="sm" icon={<Copy size={16} />} onClick={() => void copyCode()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            <p className="mt-2 text-[14px] text-neutral-600">
              {share.revoked ? (
                <Badge tone="neutral">Sharing stopped</Badge>
              ) : (
                <>Expires {formatDate(share.expiresAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</>
              )}
            </p>
            {!share.revoked && (
              <Button variant="tertiary" size="sm" className="mt-3" onClick={() => void revoke()}>
                Stop sharing
              </Button>
            )}
          </Card>
        )}

        <Card>
          <CardHeader title="Open a shared deck" description="Got a code from a friend? View their deck here (read-only)." />
          <CardBody>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void openCode();
              }}
            >
              <Field label="Share code" htmlFor="share-code" className="flex-1">
                <Input id="share-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" placeholder="e.g. 3F9A1C2B" className="tabular font-mono tracking-wider" />
              </Field>
              <Button type="submit" variant="secondary" loading={opening} disabled={!code.trim()}>
                Open read-only
              </Button>
            </form>
            {openError && (
              <Callout tone="danger" className="mt-3">
                {openError}
              </Callout>
            )}
            {opened && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4" aria-live="polite">
                <div>
                  <p className="font-semibold text-neutral-900">{opened.title}</p>
                  {opened.expiresAt && <p className="text-caption text-neutral-600">Available until {formatDate(opened.expiresAt)}</p>}
                </div>
                {opened.deckId && (
                  <Link href={`/revise/decks/${opened.deckId}`} className="text-[14px] font-semibold text-brand-navy hover:underline">
                    Study it
                  </Link>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppPage>
  );
}
