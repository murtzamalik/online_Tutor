"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import * as api from "@/lib/api/w4";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Table, Td, Th, type Tone } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatDateTime, humanise, str } from "@/components/parent/format";

type Alert = { alertId: string; kind?: string; severity?: string; message?: string; status?: string; createdAt?: unknown };

const SEVERITY_TONE: Record<string, Tone> = { HIGH: "danger", MEDIUM: "warning", LOW: "info" };

/** H-05 Early-warning drift alerts */
export default function AlertsPage() {
  const { id } = useParams<{ id: string }>();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { state, retry, setData } = useLoad<Alert[]>(
    async () => {
      const r = await api.getAlerts(id);
      return (r.items ?? []).map((v) => {
        const a = asRecord(v);
        return {
          alertId: str(a.alertId) ?? "",
          kind: str(a.kind),
          severity: str(a.severity),
          message: str(a.message),
          status: str(a.status),
          createdAt: a.createdAt,
        };
      });
    },
    [id],
    "Could not load alerts",
  );

  async function ack(alertId: string) {
    if (state.status !== "ready") return;
    setBusy(alertId);
    setActionError(null);
    try {
      await api.ackAlert(alertId);
      setData(state.data.map((a) => (a.alertId === alertId ? { ...a, status: "ACK" } : a)));
    } catch (e) {
      setActionError(errorMessage(e, "Could not acknowledge that alert. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppPage>
      <ChildHeader
        studentId={id}
        active="alerts"
        title="Early-warning alerts"
        description="We flag changes such as practice dropping off. At most one alert of each kind every 7 days."
      />
      <div aria-live="polite" className="space-y-4">
        {actionError && <Callout tone="danger">{actionError}</Callout>}
        <LoadView state={state} onRetry={retry}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState title="No alerts" body="Nothing to review right now. We'll tell you here and by email if anything changes." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Alert</Th>
                    <Th className="hidden md:table-cell">Severity</Th>
                    <Th className="hidden sm:table-cell">Raised</Th>
                    <Th>Status</Th>
                    <Th>
                      <span className="sr-only">Action</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.alertId}>
                      <Td>
                        <p className="font-semibold">{humanise(a.kind, "Alert")}</p>
                        <p className="mt-0.5 text-[14px] text-neutral-700">{a.message ?? "—"}</p>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <Badge tone={SEVERITY_TONE[a.severity ?? ""] ?? "neutral"}>{humanise(a.severity)}</Badge>
                      </Td>
                      <Td className="tabular hidden whitespace-nowrap text-neutral-600 sm:table-cell">{formatDateTime(a.createdAt)}</Td>
                      <Td>
                        <Badge tone={a.status === "NEW" ? "info" : "neutral"}>{a.status === "NEW" ? "New" : a.status === "ACK" ? "Acknowledged" : humanise(a.status)}</Badge>
                      </Td>
                      <Td className="text-right">
                        {a.status === "NEW" && (
                          <Button variant="secondary" size="sm" loading={busy === a.alertId} onClick={() => ack(a.alertId)}>
                            Acknowledge
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          }
        </LoadView>
      </div>
    </AppPage>
  );
}
