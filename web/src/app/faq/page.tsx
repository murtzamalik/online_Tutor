"use client";

import { useEffect, useState } from "react";
import { listFaq } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** A-03 — FAQ */
export default function FaqPage() {
  const [items, setItems] = useState<
    { faqId: string | number; category: string; question: string; answerMd: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFaq()
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load FAQ"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">FAQ</h1>
      <p className="mt-2 text-ink/70">Marking, boards, cost, and parent accounts.</p>
      {!items && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {items && items.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No FAQ yet" body="Check back soon." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-6">
          {items.map((f) => (
            <li key={String(f.faqId)}>
              <p className="text-xs uppercase tracking-wide text-ink/50">{f.category}</p>
              <h2 className="font-display text-xl">{f.question}</h2>
              <p className="mt-2 whitespace-pre-wrap text-ink/80">{f.answerMd}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
