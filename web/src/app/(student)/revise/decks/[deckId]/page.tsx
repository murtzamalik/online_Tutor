"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowsClockwise, CheckCircle, ShareNetwork } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Callout, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { FailureView, ProgressBar } from "@/components/student/StudentUI";
import { asArray, errorText, isRecord, num, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type FlashCard = { cardId: string; front: string; back: string; position: number };
type Deck = { deckId: string; title: string; kind: string; cards: FlashCard[] };

function parseDeck(raw: unknown): Deck | null {
  if (!isRecord(raw)) return null;
  const cards = asArray(raw.cards)
    .filter(isRecord)
    .map((c, i) => ({ cardId: str(c.cardId), front: str(c.front), back: str(c.back), position: num(c.position) ?? i }))
    .sort((a, b) => a.position - b.position);
  return { deckId: str(raw.deckId), title: str(raw.title, "Flashcards"), kind: str(raw.kind), cards };
}

const RATINGS = [
  { rating: 1, label: "Again", hint: "Didn’t know it", cls: "border-answer-incorrect/30 text-answer-incorrect hover:bg-[#FBE9E7]" },
  { rating: 2, label: "Hard", hint: "Took a while", cls: "border-answer-partial/40 text-[#8A6508] hover:bg-[#FBF3DF]" },
  { rating: 3, label: "Good", hint: "Got it", cls: "border-brand-navy/30 text-brand-navy hover:bg-brand-navySoft" },
  { rating: 4, label: "Easy", hint: "Knew it instantly", cls: "border-answer-correct/30 text-answer-correct hover:bg-[#E7F4EC]" },
] as const;

/** I-01 — Flashcard study (flip card + spaced-repetition rating via POST /revision/cards/{id}/review). */
export default function Page() {
  const params = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setFailure(null);
    setDeck(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const result: unknown = await api.myDecks(params.deckId, token);
      setDeck(parseDeck(result) ?? { deckId: params.deckId, title: "Flashcards", kind: "", cards: [] });
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, [params.deckId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function rate(r: number) {
    if (!deck) return;
    const card = deck.cards[index];
    if (!card) return;
    setRating(r);
    setRateError(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      await api.reviewCard(card.cardId, { rating: r }, token);
      setTally((t) => ({ ...t, [r]: (t[r] ?? 0) + 1 }));
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (e) {
      setRateError(errorText(e, "That rating wasn’t saved. Try again."));
    } finally {
      setRating(null);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setTally({});
  }

  const total = deck?.cards.length ?? 0;
  const done = deck != null && total > 0 && index >= total;
  const card = deck && !done ? deck.cards[index] : null;

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Flashcards"
        title={deck?.title ?? "Flashcards"}
        actions={
          deck?.kind === "CUSTOM" ? (
            <ButtonLink href="/revise/share" variant="tertiary" size="sm" icon={<ShareNetwork size={16} />}>
              Share
            </ButtonLink>
          ) : (
            <ButtonLink href="/revise" variant="tertiary" size="sm">
              All decks
            </ButtonLink>
          )
        }
      />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : !deck ? (
        <LoadingState lines={4} />
      ) : total === 0 ? (
        <EmptyState
          title="This deck has no cards yet"
          body="Make your own deck with the cards you want to learn."
          action={<ButtonLink href="/revise/decks/new">Create a deck</ButtonLink>}
        />
      ) : done ? (
        <Card className="animate-rise p-8 text-center" aria-live="polite">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal">
            <CheckCircle size={26} weight="fill" />
          </span>
          <h2 className="mt-3 text-h2">Deck complete</h2>
          <p className="mt-1 text-neutral-600">We’ll bring cards back just before you’re likely to forget them.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {RATINGS.map((r) => (
              <Badge key={r.rating} tone={r.rating === 1 ? "danger" : r.rating === 2 ? "warning" : r.rating === 3 ? "brand" : "success"}>
                {r.label}: <span className="tabular">{tally[r.rating] ?? 0}</span>
              </Badge>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/revise">Back to revise</ButtonLink>
            <Button variant="secondary" onClick={restart} icon={<ArrowsClockwise size={18} />}>
              Study again
            </Button>
          </div>
        </Card>
      ) : (
        card && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-[14px] text-neutral-600">
              <span className="tabular">
                Card {index + 1} of {total}
              </span>
              <span>{flipped ? "How well did you know it?" : "Think of the answer, then flip"}</span>
            </div>
            <ProgressBar value={index} max={total} label="Cards studied" />

            {/* Flip card */}
            <div className="[perspective:1200px]">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? "Show the front of the card" : "Flip to see the answer"}
                aria-pressed={flipped}
                className="group relative block h-72 w-full text-left focus-visible:outline-none sm:h-80"
              >
                <span
                  className={cx(
                    "absolute inset-0 rounded-xl transition-transform duration-slow ease-in-out [transform-style:preserve-3d]",
                    flipped && "[transform:rotateY(180deg)]",
                  )}
                >
                  <span className="absolute inset-0 flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-raised [backface-visibility:hidden] group-focus-visible:ring-2 group-focus-visible:ring-brand-navy/30">
                    <span className="text-caption font-semibold uppercase tracking-wide text-neutral-600">Front</span>
                    <span className="flex flex-1 items-center justify-center text-center text-[22px] font-semibold leading-snug text-neutral-900">
                      {card.front}
                    </span>
                    <span className="text-center text-caption text-neutral-600">Tap or press Enter to flip</span>
                  </span>
                  <span className="absolute inset-0 flex flex-col rounded-xl border border-brand-navy/20 bg-brand-navySoft p-6 shadow-raised [backface-visibility:hidden] [transform:rotateY(180deg)] group-focus-visible:ring-2 group-focus-visible:ring-brand-navy/30">
                    <span className="text-caption font-semibold uppercase tracking-wide text-brand-navy">Back</span>
                    <span className="flex flex-1 items-center justify-center whitespace-pre-wrap text-center text-[19px] leading-relaxed text-neutral-900">
                      {card.back}
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              {flipped ? `Answer: ${card.back}` : ""}
            </p>

            {rateError && <Callout tone="danger">{rateError}</Callout>}

            {flipped ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Rate this card">
                {RATINGS.map((r) => (
                  <button
                    key={r.rating}
                    type="button"
                    disabled={rating !== null}
                    onClick={() => void rate(r.rating)}
                    className={cx(
                      "rounded-md border-[1.5px] bg-white px-3 py-2.5 text-center transition-colors duration-fast disabled:opacity-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
                      r.cls,
                    )}
                  >
                    <span className="block font-semibold">{rating === r.rating ? "Saving…" : r.label}</span>
                    <span className="block text-caption text-neutral-600">{r.hint}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <Button size="lg" onClick={() => setFlipped(true)}>
                  Show answer
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </AppPage>
  );
}
