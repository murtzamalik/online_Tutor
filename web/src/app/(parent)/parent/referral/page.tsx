"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** C-07 Referral — no dark patterns */
export default function ReferralPage() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReferral()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Could not load referral"))
      .finally(() => setLoading(false));
  }, []);

  async function invite() {
    try {
      const r = await api.inviteReferral(email);
      setData(r);
    } catch (e: any) {
      setError(e?.message ?? "Invite failed");
    }
  }

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Refer a family</h1>
        <p className="mt-2 text-sm">Reward only after your invitee&apos;s first paid invoice — never for signup alone.</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {data && (
          <div className="mt-8 space-y-3 animate-rise">
            <p>Your code: <strong>{data.code}</strong></p>
            <p className="text-sm">Configured reward: {data.rewardPence ?? "—"} pence</p>
            <p className="text-sm opacity-80">{data.note}</p>
            <label className="block text-sm">
              Invite email
              <input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Invitee email" />
            </label>
            <button type="button" className="rounded border px-4 py-2" onClick={invite}>Send invite</button>
          </div>
        )}
        <p className="mt-6 text-sm"><Link className="underline" href="/parent">Back</Link></p>
      </main>
    </div>
  );
}
