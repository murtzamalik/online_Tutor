"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLegal, postCookieConsent } from "@/lib/api/marketing";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** Shell-10 — Legal document + cookie banner hook */
export default function LegalPage() {
  const params = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<{ title: string; bodyMd: string; version: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cookieNote, setCookieNote] = useState<string | null>(null);

  useEffect(() => {
    getLegal(params.slug)
      .then((d) => setDoc(d))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Document not found"));
  }, [params.slug]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {!doc && !error && <LoadingState />}
      {error && <ErrorState body={error} />}
      {doc && (
        <>
          <h1 className="font-display text-4xl">{doc.title}</h1>
          <p className="mt-1 text-sm text-ink/50">Version {doc.version}</p>
          <article className="prose mt-8 whitespace-pre-wrap text-ink/90">{doc.bodyMd}</article>
        </>
      )}
      {params.slug === "cookies" && (
        <div className="mt-10 rounded-md border border-mist p-4">
          <p className="font-medium">Update cookie preferences</p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await postCookieConsent({ essential: true, analytics: true });
                  setCookieNote("Analytics accepted");
                } catch (err) {
                  setCookieNote(err instanceof ApiError ? err.message : "Failed");
                }
              }}
            >
              Accept analytics
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await postCookieConsent({ essential: true, analytics: false });
                  setCookieNote("Essential only");
                } catch (err) {
                  setCookieNote(err instanceof ApiError ? err.message : "Failed");
                }
              }}
            >
              Essential only
            </Button>
          </div>
          {cookieNote && (
            <p className="mt-2 text-sm" role="status">
              {cookieNote}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
