"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

/** H-05 Early-warning drift alerts */
export default function AlertsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts(id)
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(e?.message ?? "Could not load alerts"))
      .finally(() => setLoading(false));
  }, [id]);

  async function ack(alertId: string) {
    await api.ackAlert(alertId);
    setItems((prev) => prev.map((a) => (a.alertId === alertId ? { ...a, status: "ACK" } : a)));
  }

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl">Early-warning alerts</h1>
        <p className="mt-2 text-sm">At most one alert per kind per 7 days (server-enforced).</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {!loading && !error && items.length === 0 && (
          <div className="mt-8"><EmptyState title="No alerts" body="Nothing to review right now." /></div>
        )}
        <ul className="mt-8 space-y-3" role="list">
          {items.map((a) => (
            <li key={a.alertId} className="rounded border p-4">
              <p className="font-medium">{a.kind} · {a.severity}</p>
              <p className="text-sm mt-1">{a.message}</p>
              <p className="text-xs mt-1 opacity-60">{a.status}</p>
              {a.status === "NEW" && (
                <button type="button" className="mt-2 text-sm underline" onClick={() => ack(a.alertId)}>Acknowledge</button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm"><Link className="underline" href={`/parent/children/${id}`}>Back</Link></p>
      </main>
    </div>
  );
}
