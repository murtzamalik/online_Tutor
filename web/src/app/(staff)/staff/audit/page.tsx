"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardBody, CardHeader, Field, Input, KeyValue, PageHeader, Select, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { DataState, DetailPlaceholder, FilterBar, QueueLayout, SelectableRow, StatRow, useApi } from "@/components/staff/ops";
import { fmtDateTime, humanise, int, shortId, str, type Row } from "@/components/staff/format";
import { auditLog } from "@/lib/api/w2";

/** AUD-01 — Tamper-evident audit log (compliance). */
export default function AuditLogPage() {
  const state = useApi<Row[]>(async () => (await auditLog()).items as Row[]);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const opts = useMemo(() => {
    const items = state.data ?? [];
    return {
      actions: Array.from(new Set(items.map((i) => str(i.action, "")).filter(Boolean))).sort(),
      roles: Array.from(new Set(items.map((i) => str(i.actorRole, "")).filter(Boolean))).sort(),
    };
  }, [state.data]);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="The latest 100 privileged actions. Each row is hash-chained to the one before it."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <DataState
        state={state}
        forbiddenBody="The audit log is for the compliance team only."
        errorTitle="Could not load the audit log"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No audit entries"
        emptyBody="Privileged actions will be recorded here."
      >
        {(items) => {
          const needle = q.trim().toLowerCase();
          const rows = items.filter(
            (i) =>
              (!action || str(i.action, "") === action) &&
              (!role || str(i.actorRole, "") === role) &&
              (!needle ||
                [i.action, i.targetType, i.targetId, i.actorAccountId].some((v) => str(v, "").toLowerCase().includes(needle))),
          );
          const selected = items.find((i) => str(i.auditId) === selectedId) ?? null;
          const actors = new Set(items.map((i) => str(i.actorAccountId, "")).filter(Boolean)).size;
          return (
            <>
              <StatRow cols={3}>
                <StatTile label="Entries shown" value={int(items.length)} />
                <StatTile label="Distinct actions" value={int(opts.actions.length)} />
                <StatTile label="Distinct actors" value={int(actors)} />
              </StatRow>
              <FilterBar>
                <Field label="Search" htmlFor="a-q" className="w-full sm:w-64">
                  <Input id="a-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Action, target or actor ID" />
                </Field>
                <Field label="Action" htmlFor="a-action" className="w-full sm:w-52">
                  <Select id="a-action" value={action} onChange={(e) => setAction(e.target.value)}>
                    <option value="">All actions</option>
                    {opts.actions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Actor role" htmlFor="a-role" className="w-full sm:w-40">
                  <Select id="a-role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">All roles</option>
                    {opts.roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FilterBar>
              <QueueLayout
                list={
                  rows.length === 0 ? (
                    <EmptyState title="No entries match" body="Clear the search or filters." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>When</Th>
                          <Th>Action</Th>
                          <Th>Actor</Th>
                          <Th>Target</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((i) => {
                          const id = str(i.auditId);
                          return (
                            <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Audit entry ${id}`}>
                              <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDateTime(i.occurredAt)}</Td>
                              <Td className="font-mono text-[13px]">{str(i.action)}</Td>
                              <Td>{i.actorRole ? <Badge tone="brand">{str(i.actorRole)}</Badge> : <Badge>System</Badge>}</Td>
                              <Td>
                                <span className="block">{humanise(i.targetType)}</span>
                                <span className="text-caption text-neutral-600 tabular">{shortId(i.targetId)}</span>
                              </Td>
                            </SelectableRow>
                          );
                        })}
                      </tbody>
                    </Table>
                  )
                }
                detail={
                  selected ? (
                    <Card>
                      <CardHeader title={str(selected.action)} description={`Entry #${str(selected.auditId)}`} />
                      <CardBody>
                        <KeyValue
                          items={[
                            ["Occurred", fmtDateTime(selected.occurredAt)],
                            ["Actor role", str(selected.actorRole, "System")],
                            ["Actor ID", <span key="a" className="break-all font-mono text-[12px]">{str(selected.actorAccountId)}</span>],
                            ["Target type", humanise(selected.targetType)],
                            ["Target ID", <span key="t" className="break-all font-mono text-[12px]">{str(selected.targetId)}</span>],
                            ["Row hash", <span key="h" className="break-all font-mono text-[12px]">{str(selected.rowHash)}</span>],
                          ]}
                        />
                      </CardBody>
                    </Card>
                  ) : (
                    <DetailPlaceholder body="Select an entry to see the actor, target and row hash." />
                  )
                }
              />
            </>
          );
        }}
      </DataState>
    </AppPage>
  );
}
