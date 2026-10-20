"use client";

import { useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Field, KeyValue, PageHeader, Select, StatTile, Table, Td, Textarea, Th } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, DetailPlaceholder, FilterBar, QueueLayout, ResultNote, SelectableRow, StatRow, StatusBadge, actionError, useApi, type Note } from "@/components/staff/ops";
import { TextBlock } from "@/components/staff/marking";
import { fmtDateTime, humanise, int, shortId, slaInfo, str, type Row } from "@/components/staff/format";
import { disclosures } from "@/lib/api/w2";
import { useSession } from "@/components/shell/session";
import { closeDisclosure, getDisclosure, logDisclosureAction } from "@/lib/api/staff-ops";

const OPEN = new Set(["OPEN", "ACTIONED", "REFERRED"]);

/** SAF-06 — Safeguarding disclosures log (DSL). */
export default function SafeguardingPage() {
  const state = useApi<Row[]>(async () => (await disclosures()).items as Row[]);
  const [status, setStatus] = useState("OPEN_ANY");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Safety"
        title="Safeguarding disclosures"
        description="Disclosures opened from escalated safety flags. Each has a 4-hour response SLA."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <DataState
        state={state}
        forbiddenBody="Safeguarding disclosures are visible to the designated safeguarding lead only."
        errorTitle="Could not load disclosures"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No disclosures"
        emptyBody="Disclosures appear here when a safety flag is escalated."
      >
        {(items) => {
          const open = items.filter((d) => OPEN.has(str(d.status, ""))).length;
          const overdue = items.filter((d) => OPEN.has(str(d.status, "")) && slaInfo(d.slaDueAt).tone === "danger").length;
          const rows = items.filter((d) =>
            status === "" ? true : status === "OPEN_ANY" ? OPEN.has(str(d.status, "")) : str(d.status, "") === status,
          );
          const selected = items.find((d) => str(d.disclosureId) === selectedId) ?? null;
          return (
            <>
              <StatRow cols={3}>
                <StatTile label="Open" value={int(open)} />
                <StatTile label="Past SLA" value={int(overdue)} hint={overdue ? "Act now" : "None overdue"} />
                <StatTile label="Closed" value={int(items.filter((d) => str(d.status, "") === "CLOSED").length)} />
              </StatRow>
              <FilterBar>
                <Field label="Status" htmlFor="d-status" className="w-full sm:w-44">
                  <Select id="d-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="OPEN_ANY">Not closed</option>
                    <option value="OPEN">Open</option>
                    <option value="ACTIONED">Actioned</option>
                    <option value="REFERRED">Referred</option>
                    <option value="CLOSED">Closed</option>
                    <option value="">All</option>
                  </Select>
                </Field>
              </FilterBar>
              <QueueLayout
                list={
                  rows.length === 0 ? (
                    <EmptyState title="Nothing in this view" body="Choose another status." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Opened</Th>
                          <Th>Category</Th>
                          <Th>Status</Th>
                          <Th>SLA</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => {
                          const id = str(d.disclosureId);
                          const sla = slaInfo(d.slaDueAt);
                          return (
                            <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Disclosure ${shortId(id)}`}>
                              <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDateTime(d.createdAt)}</Td>
                              <Td>{humanise(d.category)}</Td>
                              <Td>
                                <StatusBadge status={d.status} />
                              </Td>
                              <Td>{OPEN.has(str(d.status, "")) ? <Badge tone={sla.tone}>{sla.label}</Badge> : "—"}</Td>
                            </SelectableRow>
                          );
                        })}
                      </tbody>
                    </Table>
                  )
                }
                detail={
                  selected ? (
                    <DisclosureDetail key={str(selected.disclosureId)} row={selected} onChanged={() => void state.reload()} />
                  ) : (
                    <DetailPlaceholder body="Select a disclosure to see its summary and SLA." />
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

const ACTIONS: Array<[string, string]> = [
  ["CONTACTED_PARENT", "Contacted parent"],
  ["CONTACTED_SCHOOL_DSL", "Contacted school DSL"],
  ["REFERRED_EXTERNAL", "Referred externally"],
  ["NOTE", "Note"],
];

const REFERRALS: Array<[string, string]> = [
  ["NONE", "No referral needed"],
  ["PARENT", "Parent"],
  ["SCHOOL_DSL", "School DSL"],
  ["LADO", "LADO"],
  ["SOCIAL_CARE", "Children’s social care"],
  ["POLICE", "Police"],
];

/** SAF-07/08/09 — detail, action log, and close with outcome. */
function DisclosureDetail({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const id = str(row.disclosureId);
  const detail = useApi<Row>(() => getDisclosure(id), { key: id });
  const [actionType, setActionType] = useState("CONTACTED_PARENT");
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [referral, setReferral] = useState("NONE");
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Note>(null);
  const d: Row = { ...row, ...(detail.data ?? {}) };
  const closed = str(d.status, "") === "CLOSED";
  // Compliance can read the log; only the designated safeguarding lead records actions (SAF-08/09).
  const roles = useSession()?.roles ?? [];
  const canAct = roles.includes("SAFEGUARDING_LEAD") || roles.includes("DSL");
  const actions = Array.isArray(detail.data?.actions) ? (detail.data?.actions as Row[]) : [];

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      setNote("");
      setOutcome("");
      setClosing(false);
      await detail.reload();
      onChanged();
    } catch (err) {
      setMsg({ tone: "danger", text: actionError(err, "That didn’t save. Try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={humanise(d.category)} description={`Disclosure ${shortId(d.disclosureId)}`} action={<StatusBadge status={d.status} />} />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Opened", fmtDateTime(d.createdAt)],
            ["SLA due", fmtDateTime(d.slaDueAt)],
            ["Learner", <span key="l" className="font-mono text-[12px]">{shortId(d.studentId)}</span>],
            ["Referral", humanise(d.referralTarget)],
          ]}
        />
        <TextBlock label="Summary" text={d.summary} />

        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">Actions</p>
          {!detail.data ? (
            <LoadingState lines={2} />
          ) : actions.length === 0 ? (
            <p className="text-[14px] text-neutral-600">Nothing logged yet.</p>
          ) : (
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="rounded-md border border-neutral-200 px-3 py-2 text-[14px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{humanise(a.actionType)}</span>
                    <span className="text-caption text-neutral-600">{fmtDateTime(a.createdAt)}</span>
                  </div>
                  {str(a.note, "") && <p className="mt-0.5 text-neutral-700">{str(a.note)}</p>}
                  {str(a.actor, "") && <p className="mt-0.5 text-caption text-neutral-600">{str(a.actor)}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        <ResultNote note={msg} />
        {!canAct && !closed && <p className="text-caption text-neutral-600">Read-only: actions are recorded by the safeguarding lead.</p>}

        {canAct && !closed && !closing && (
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <Field label="Log an action" htmlFor="sg-action">
              <Select id="sg-action" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                {ACTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Note" htmlFor="sg-note" hint="Recorded with your name in the safeguarding log.">
              <Textarea id="sg-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[90px]" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button
                loading={busy}
                disabled={!note.trim()}
                onClick={() => void run(() => logDisclosureAction(id, actionType, note.trim()), "Action logged.")}
              >
                Log action
              </Button>
              <Button variant="secondary" onClick={() => setClosing(true)} disabled={busy}>
                Close…
              </Button>
            </div>
          </div>
        )}

        {canAct && !closed && closing && (
          <Callout tone="warning" title="Close this disclosure?">
            <div className="mt-2 space-y-3">
              <Field label="Referred to" htmlFor="sg-ref">
                <Select id="sg-ref" value={referral} onChange={(e) => setReferral(e.target.value)}>
                  {REFERRALS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Outcome" htmlFor="sg-outcome">
                <Textarea id="sg-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className="min-h-[90px]" />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  loading={busy}
                  disabled={!outcome.trim()}
                  onClick={() => void run(() => closeDisclosure(id, referral, outcome.trim()), "Disclosure closed.")}
                >
                  Close disclosure
                </Button>
                <Button variant="tertiary" size="sm" onClick={() => setClosing(false)}>Cancel</Button>
              </div>
            </div>
          </Callout>
        )}
      </CardBody>
    </Card>
  );
}
