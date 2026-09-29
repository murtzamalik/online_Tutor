"use client";

import { useEffect, useState } from "react";
import { listPrompts, modelRouting } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** Q-03 — Prompts & model routing */
export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Record<string, unknown>[] | null>(null);
  const [routing, setRouting] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await listPrompts();
        setPrompts(p.items);
        const r = await modelRouting();
        setRouting(r.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "AIE role required");
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Prompts & routing</h1>
      <p className="mt-2 text-ink/70">Prompt registry versions and model routing table.</p>
      {!prompts && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8">
          <ErrorState body={error} />
        </div>
      )}
      {prompts && prompts.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No prompts" body="Seed prompt_version rows first." />
        </div>
      )}
      {prompts && prompts.length > 0 && (
        <ul className="mt-8 space-y-2">
          {prompts.map((p) => (
            <li key={String(p.promptId)} className="rounded-md border border-mist px-3 py-2 text-sm">
              {String(p.promptId)} · v{String(p.version)} · {String(p.status)} · {String(p.taskKey)}
            </li>
          ))}
        </ul>
      )}
      {routing && routing.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl">Model routing</h2>
          <ul className="mt-3 space-y-2">
            {routing.slice(0, 20).map((r) => (
              <li key={String(r.taskKey)} className="text-sm">
                {String(r.taskKey)} → {String(r.modelId)} ({String(r.modelTier)})
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
