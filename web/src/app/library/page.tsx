"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** A-10 Free Resource Library */
export default function LibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [kind, setKind] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLibraryResources()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(e?.message ?? "Could not load library"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (kind === "ALL" ? items : items.filter((i) => i.kind === kind)),
    [items, kind],
  );

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-4xl">Free resource library</h1>
        <p className="mt-2 text-sm text-ink/70">Browse glossary and past-paper indexes — no email gate for open items.</p>
        <label className="mt-6 block text-sm">
          Filter
          <select className="ml-2 rounded border px-2 py-1" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Resource kind filter">
            <option value="ALL">All</option>
            <option value="GLOSSARY">Glossary</option>
            <option value="PAST_PAPER_INDEX">Past papers</option>
            <option value="GUIDE">Guides</option>
            <option value="LEAD_MAGNET">Lead magnets</option>
          </select>
        </label>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-8"><EmptyState title="No resources" body="Nothing published in this filter yet." /></div>
        )}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2" role="list">
          {filtered.map((r) => (
            <li key={String(r.resourceId)} className="rounded border border-mist bg-white/70 p-4 animate-rise">
              <h2 className="font-display text-xl">{r.title}</h2>
              <p className="text-sm opacity-70">{r.kind}</p>
              {r.emailGated ? (
                <p className="mt-2 text-sm">
                  Email-gated — <Link className="underline" href={`/resources/${r.resourceId}`}>open via A-05</Link>
                </p>
              ) : (
                <p className="mt-2 text-sm whitespace-pre-wrap">{(r.bodyMd ?? "").slice(0, 180)}</p>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
