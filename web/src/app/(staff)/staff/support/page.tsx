"use client";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { supportSearch } from "@/lib/api/w2";

export default function Page() {

  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function search() {
    try { const r = await supportSearch(q); setItems(r.items); } catch { setError("Support search failed"); }
  }

  return (
    <div>
      <AppNav displayName="Staff" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Support console</h1>

        <input className="mt-6 w-full rounded border p-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email or name" aria-label="Search" />
        <button type="button" className="mt-3 rounded bg-accent px-4 py-2 text-white" onClick={search}>Search</button>
        {error && <div className="mt-4"><ErrorState body={error} /></div>}
        <ul className="mt-6 space-y-2">{items?.map((a) => <li key={a.accountId} className="rounded border p-3 text-sm">{a.displayName} · {a.email} · {a.kind}</li>)}</ul>

      </main>
    </div>
  );
}
