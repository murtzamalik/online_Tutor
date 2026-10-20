"use client";

import { useParams } from "next/navigation";
import * as api from "@/lib/api/w3";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asArray, asRecord, formatDate, humanise, str } from "@/components/parent/format";

type Misconception = { key: string; topicName?: string; label?: string; plainEnglish?: string; observedAt?: unknown };

/** H-02 — Misconceptions */
export default function Page() {
  const params = useParams() as Record<string, string>;
  const token = typeof window !== "undefined" ? sessionStorage.getItem("accessToken") ?? undefined : undefined;
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;
  const childId = typeof window !== "undefined" ? (sessionStorage.getItem("childId") || params.id || studentId) : params.id;
  const target = params.id || childId || "";

  const { state, retry } = useLoad<Misconception[]>(
    async () => {
      const result = asRecord(await api.misconceptions(target, token));
      // The API returns a single placeholder row (no observationId) when nothing is recorded.
      return asArray(result.items)
        .map((v) => asRecord(v))
        .filter((r) => r.observationId != null)
        .map((r, i) => ({
          key: str(r.observationId) ?? `row-${i}`,
          topicName: str(r.topicName),
          label: str(r.label),
          plainEnglish: str(r.plainEnglish),
          observedAt: r.observedAt,
        }));
    },
    [target, token],
    "Could not load misconceptions",
  );

  const topics = state.status === "ready" ? new Set(state.data.map((m) => m.topicName).filter(Boolean)).size : 0;

  return (
    <AppPage>
      <ChildHeader
        studentId={params.id}
        active="misconceptions"
        title="Misconceptions"
        description="Patterns the marking engine has spotted in your child's answers, explained in plain English."
      />
      <LoadView state={state} onRetry={retry}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              title="No misconceptions recorded yet"
              body="Keep practising — when the marking engine spots a pattern in wrong answers, it appears here in plain English."
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <StatTile label="Observations" value={items.length} hint="Most recent 50" />
                <StatTile label="Topics affected" value={topics} />
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Topic</Th>
                    <Th>What we noticed</Th>
                    <Th className="hidden md:table-cell">Seen</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.key}>
                      <Td className="align-top font-medium">{m.topicName ?? "—"}</Td>
                      <Td className="align-top">
                        <p className="text-neutral-800">{m.plainEnglish ?? "—"}</p>
                        {m.label && (
                          <Badge tone="neutral" className="mt-1.5">
                            {humanise(m.label)}
                          </Badge>
                        )}
                      </Td>
                      <Td className="tabular hidden whitespace-nowrap align-top text-neutral-600 md:table-cell">{formatDate(m.observedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )
        }
      </LoadView>
    </AppPage>
  );
}
