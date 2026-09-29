"use client";

import { useEffect, useState } from "react";
import { listStyleProfiles, putStyleProfile } from "@/lib/api/staff";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** M-02 — Board style profiles */
export default function StylePage() {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      const r = await listStyleProfiles();
      setItems(r.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CNT role required");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Style profiles</h1>
      <p className="mt-2 text-ink/70">Board wording and mark-scheme format notes.</p>
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
          <EmptyState title="No profiles" body="Derive or create a profile for a specification." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-8 space-y-4">
          {items.map((p) => {
            const id = String(p.specificationId);
            return (
              <li key={id} className="rounded-md border border-mist bg-white/70 p-4">
                <p className="font-semibold">
                  {String(p.specCode)} — {String(p.title)}
                </p>
                <p className="mt-2 text-sm text-ink/70">{String(p.questionWordingNotes ?? "")}</p>
                <Button
                  className="mt-3"
                  onClick={async () => {
                    try {
                      await putStyleProfile(id, {
                        questionWordingNotes: `${String(p.questionWordingNotes ?? "")} (edited W1)`,
                      });
                      setNote(`Updated ${String(p.specCode)}`);
                      await reload();
                    } catch (err) {
                      setNote(err instanceof ApiError ? err.message : "Update failed");
                    }
                  }}
                >
                  Touch wording notes
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {note && (
        <p className="mt-4 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
