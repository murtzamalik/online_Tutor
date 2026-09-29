"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState } from "@/components/ui/states";
import { under13Consent } from "@/lib/api/w2";

/** L-01 under-13 parental consent */
export default function Under13ConsentPage() {
  const { id } = useParams<{ id: string }>();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">Under-13 consent</h1>
        <p className="mt-2 text-ink/70">Confirm you are a parent/guardian and agree to data processing for your under-13 child.</p>
        {error && <div className="mt-4"><ErrorState body={error} /></div>}
        {ok ? <p className="mt-6" role="status">Consent recorded.</p> : (
          <button type="button" className="mt-6 rounded bg-accent px-4 py-2 text-white" onClick={() => under13Consent(id).then(() => setOk(true)).catch((e) => setError(String(e.message || e)))}>I consent</button>
        )}
      </main>
    </div>
  );
}
