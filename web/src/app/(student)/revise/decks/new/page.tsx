"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { errorText, isRecord, parseTopics, readSession, readToken, str, type StudentTopic } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type Draft = { id: number; front: string; back: string };

let nextId = 1;
const blank = (): Draft => ({ id: nextId++, front: "", back: "" });

/** I-02 — Custom flashcard builder (POST /revision/decks { title, topicId?, cards: [{ front, back }] }). */
export default function Page() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<StudentTopic[]>([]);
  const [cards, setCards] = useState<Draft[]>(() => [blank(), blank()]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentId = readSession("studentId");
    if (!studentId) return;
    api
      .studentTopics(studentId, readToken())
      .then((r: unknown) => setTopics(parseTopics(r)))
      .catch(() => setTopics([]));
  }, []);

  const filled = cards.filter((c) => c.front.trim() && c.back.trim());
  const halfFilled = cards.filter((c) => (c.front.trim() ? !c.back.trim() : !!c.back.trim()));
  const titleError = touched && !title.trim() ? "Give your deck a name." : null;
  const cardsError = touched && filled.length === 0 ? "Add at least one card with a front and a back." : touched && halfFilled.length > 0 ? "Some cards are missing a front or a back." : null;

  function update(id: number, patch: Partial<Draft>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function create() {
    setTouched(true);
    if (!title.trim() || filled.length === 0 || halfFilled.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        cards: filled.map((c) => ({ front: c.front.trim(), back: c.back.trim() })),
      };
      if (topicId) body.topicId = Number(topicId);
      const res: unknown = await api.createDeck(body, readToken());
      const deckId = isRecord(res) ? str(res.deckId) : "";
      if (deckId) router.push(`/revise/decks/${deckId}`);
      else router.push("/revise");
    } catch (e) {
      setError(errorText(e, "We couldn't create your deck."));
      setSaving(false);
    }
  }

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Flashcards" title="Make a flashcard deck" description="Short questions on the front, answers on the back. Keep each card to one idea." />

      <form
        className="space-y-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Card>
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <Field label="Deck name" htmlFor="deck-title" error={titleError}>
              <Input id="deck-title" value={title} maxLength={80} placeholder="e.g. Atomic structure keywords" onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Topic (optional)" htmlFor="deck-topic">
              <Select id="deck-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">No topic</option>
                {topics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    {t.topicName}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cards" description={`${filled.length} ready`} />
          <CardBody className="space-y-4">
            {cards.map((c, i) => (
              <fieldset key={c.id} className="rounded-lg border border-neutral-200 p-4">
                <legend className="px-1 text-caption font-semibold text-neutral-600">Card {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Front" htmlFor={`front-${c.id}`}>
                    <Textarea id={`front-${c.id}`} className="min-h-[80px]" value={c.front} maxLength={300} onChange={(e) => update(c.id, { front: e.target.value })} />
                  </Field>
                  <Field label="Back" htmlFor={`back-${c.id}`}>
                    <Textarea id={`back-${c.id}`} className="min-h-[80px]" value={c.back} maxLength={600} onChange={(e) => update(c.id, { back: e.target.value })} />
                  </Field>
                </div>
                {cards.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Button type="button" variant="tertiary" size="sm" icon={<Trash size={16} />} onClick={() => setCards((cs) => cs.filter((x) => x.id !== c.id))}>
                      Remove card {i + 1}
                    </Button>
                  </div>
                )}
              </fieldset>
            ))}
            {cardsError && (
              <p className="text-caption text-answer-incorrect" role="alert">
                {cardsError}
              </p>
            )}
            <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={() => setCards((cs) => [...cs, blank()])} disabled={cards.length >= 50}>
              Add a card
            </Button>
          </CardBody>
        </Card>

        {error && <Callout tone="danger" title="Deck not created">{error}</Callout>}

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={saving}>
            Create deck
          </Button>
        </div>
      </form>
    </AppPage>
  );
}
