"use client";
import { useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** F-08 Photo-of-stuck walkthrough — masked upload + gateway path */
export default function TutorPhotoPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadMasked() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.photoWalkthrough({
        maskedPhotoKey: `masked/${Date.now()}.jpg`,
        maskReport: {
          header_masked: true,
          regions: [{ type: "name", masked: true }],
          user_confirmed_crop: true,
        },
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Walkthrough failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Stuck? Photo walkthrough</h1>
        <p className="mt-2 text-sm">Upload a masked photo of an unattempted question. Tutor gives a hint ladder — never the full answer.</p>
        <button type="button" className="mt-6 rounded border px-4 py-2" onClick={uploadMasked} disabled={busy}>
          Upload masked photo
        </button>
        {busy && <div className="mt-6"><LoadingState /></div>}
        {error && <div className="mt-6"><ErrorState body={error} /></div>}
        {result && (
          <div className="mt-6 space-y-3 animate-rise">
            <p className="whitespace-pre-wrap" aria-live="polite">{result.walkthrough}</p>
            <p className="text-sm">Full answer revealed: {String(result.fullAnswerRevealed)}</p>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/tutor">Tutor</Link></p>
      </main>
    </div>
  );
}
