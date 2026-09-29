"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { captureLead, listResources } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

/** A-05 — Lead magnet / resource */
export default function ResourcePage() {
  const params = useParams<{ slug: string }>();
  const [resource, setResource] = useState<{
    resourceId: string | number;
    title: string;
    bodyMd?: string | null;
    emailGated: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    listResources()
      .then((r) => {
        const match =
          r.items.find((i) => i.slug === params.slug) ||
          r.items.find((i) => String(i.resourceId) === params.slug) ||
          r.items[0];
        if (!match) {
          setError("Resource not found");
          return;
        }
        setResource(match);
        if (!match.emailGated) setUnlocked(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load resource"));
  }, [params.slug]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {!resource && !error && <LoadingState />}
      {error && <ErrorState body={error} />}
      {resource && (
        <>
          <h1 className="font-display text-4xl">{resource.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-ink/80">{resource.bodyMd}</p>
          {resource.emailGated && !unlocked && (
            <form
              className="mt-8 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await captureLead({
                    email,
                    resourceId: resource.resourceId,
                    sourcePage: `/resources/${params.slug}`,
                    marketingConsent: true,
                  });
                  setUnlocked(true);
                  setNote("Thanks — resource unlocked for this session.");
                } catch (err) {
                  setNote(err instanceof ApiError ? err.message : "Lead capture failed");
                }
              }}
            >
              <label htmlFor="res-email" className="block text-sm font-medium">
                Email to unlock download
              </label>
              <input
                id="res-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-mist px-3 py-2"
              />
              <Button type="submit">Unlock</Button>
            </form>
          )}
          {unlocked && (
            <p className="mt-8 rounded-md border border-mist bg-white/70 p-4" role="status">
              Download ready (W1 stub file). Check your inbox for the familiarisation pack link.
            </p>
          )}
          {note && (
            <p className="mt-3 text-sm" role="status">
              {note}
            </p>
          )}
        </>
      )}
      {resource === null && !error ? null : null}
      {!resource && !error ? null : resource ? null : (
        <EmptyState title="Missing" body="No matching resource." />
      )}
    </main>
  );
}
