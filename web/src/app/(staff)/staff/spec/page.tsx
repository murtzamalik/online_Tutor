"use client";

import { useEffect, useState } from "react";
import { getSpecTree, listSpecs } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** M-01 — Spec / topic tree */
export default function SpecTreePage() {
  const [specs, setSpecs] = useState<Record<string, unknown>[] | null>(null);
  const [tree, setTree] = useState<Record<string, unknown>[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSpecs()
      .then((r) => {
        setSpecs(r.items);
        const first = r.items[0];
        if (first) {
          const id = String(first.specificationId);
          setSelected(id);
          return getSpecTree(id).then((t) => setTree(t.topics));
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "CNT role required"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Spec tree</h1>
      <p className="mt-2 text-ink/70">Browse specification topics for tagging and generation.</p>
      {error && (
        <div className="mt-6">
          <ErrorState body={error} />
        </div>
      )}
      {!specs && !error && (
        <div className="mt-6">
          <LoadingState />
        </div>
      )}
      {specs && (
        <label className="mt-6 block text-sm font-medium" htmlFor="spec">
          Specification
        </label>
      )}
      {specs && (
        <select
          id="spec"
          className="mt-1 rounded-md border border-mist px-3 py-2"
          value={selected ?? ""}
          onChange={async (e) => {
            setSelected(e.target.value);
            try {
              const t = await getSpecTree(e.target.value);
              setTree(t.topics);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Tree failed");
            }
          }}
        >
          {specs.map((s) => (
            <option key={String(s.specificationId)} value={String(s.specificationId)}>
              {String(s.specCode)} — {String(s.title)}
            </option>
          ))}
        </select>
      )}
      {tree && tree.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No topics" body="Import a spec document to seed topics." />
        </div>
      )}
      {tree && tree.length > 0 && (
        <ul className="mt-8 space-y-2">
          {tree.map((t) => (
            <li key={String(t.topicId)} className="text-sm">
              L{String(t.topicLevel)} {String(t.topicNumber)} — {String(t.title)} ·{" "}
              {String(t.taggingStatus)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
