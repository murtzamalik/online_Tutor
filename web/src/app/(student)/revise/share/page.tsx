"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** I-06 Share deck / quiz set */
export default function ShareDeckPage() {
  const [decks, setDecks] = useState<any[]>([]);
  const [share, setShare] = useState<any>(null);
  const [code, setCode] = useState("");
  const [opened, setOpened] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listDecks()
      .then((r) => setDecks(r.items ?? []))
      .catch((e) => setError(e?.message ?? "Could not load decks"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Share a deck</h1>
        <p className="mt-2 text-sm">Expiring share codes; moderated before visible. Under-13 needs parent allow.</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {!loading && decks.length === 0 && (
          <div className="mt-8"><EmptyState title="No decks" body="Create a flashcard deck first." /></div>
        )}
        <ul className="mt-6 space-y-2" role="list">
          {decks.map((d) => (
            <li key={String(d.deckId)} className="flex items-center justify-between rounded border px-3 py-2">
              <span>{d.title}</span>
              <button
                type="button"
                className="text-sm underline"
                onClick={async () => {
                  try {
                    setShare(await api.shareDeck(String(d.deckId), { expiresInHours: 72 }));
                  } catch (e: any) {
                    setError(e?.message ?? "Share failed");
                  }
                }}
              >
                Share
              </button>
            </li>
          ))}
        </ul>
        {share && (
          <div className="mt-6 rounded border p-4 text-sm" aria-live="polite">
            <p>Code: <strong>{share.shareCode}</strong></p>
            <p>Expires: {share.expiresAt}</p>
            <button type="button" className="mt-2 underline" onClick={() => api.revokeShare(share.shareCode).then(() => setShare({ ...share, revoked: true }))}>
              Revoke
            </button>
          </div>
        )}
        <label className="mt-8 block text-sm">
          Open shared code
          <input className="mt-1 w-full rounded border px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Share code" />
        </label>
        <button
          type="button"
          className="mt-2 rounded border px-3 py-2"
          onClick={async () => {
            try {
              setOpened(await api.openShared(code.trim()));
            } catch (e: any) {
              setError(e?.message ?? "Open failed");
            }
          }}
        >
          Open read-only
        </button>
        {opened && <pre className="mt-4 overflow-auto rounded border p-3 text-xs">{JSON.stringify(opened, null, 2)}</pre>}
        <p className="mt-6 text-sm"><Link className="underline" href="/revise/decks">My decks</Link></p>
      </main>
    </div>
  );
}
