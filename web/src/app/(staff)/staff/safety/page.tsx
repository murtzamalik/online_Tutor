"use client";

import { useState, type FormEvent } from "react";
import { ArrowClockwise, Siren } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Field,
  KeyValue,
  PageHeader,
  Select,
  StatTile,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import {
  DataState,
  DetailPlaceholder,
  FilterBar,
  QueueLayout,
  ResultNote,
  SelectableRow,
  StatRow,
  StatusBadge,
  actionError,
  useApi,
  type Note,
} from "@/components/staff/ops";
import { TextBlock } from "@/components/staff/marking";
import { fmtDateTime, humanise, int, slaInfo, str, type Row } from "@/components/staff/format";
import { safetyFlags } from "@/lib/api/w2";
import { escalateSafetyFlag, triageSafetyFlag } from "@/lib/api/staff-ops";

const ACTIVE = new Set(["NEW", "TRIAGED"]);

/** Q-05 — AI safety flags triage (DSL / compliance). */
export default function SafetyFlagsPage() {
  const state = useApi<Row[]>(async () => (await safetyFlags()).items as Row[]);
  const [status, setStatus] = useState("ACTIVE");
  const [severity, setSeverity] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Safety"
        title="AI safety flags"
        description="Tutor conversations the safety classifier flagged. Excerpts are redacted; identity is revealed only on escalation."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />
      <DataState
        state={state}
        forbiddenBody="Safety flags are for the designated safeguarding lead and compliance team."
        errorTitle="Could not load safety flags"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No safety flags"
        emptyBody="Nothing has been flagged by the safety classifier."
      >
        {(items) => {
          const isNew = items.filter((f) => str(f.status, "") === "NEW").length;
          const escalated = items.filter((f) => str(f.status, "") === "ESCALATED").length;
          const overdue = items.filter((f) => ACTIVE.has(str(f.status, "")) && slaInfo(f.slaDueAt).tone === "danger").length;
          const severities = Array.from(new Set(items.map((f) => str(f.severity, "")).filter(Boolean))).sort();
          const rows = items.filter(
            (f) =>
              (status === "" || (status === "ACTIVE" ? ACTIVE.has(str(f.status, "")) : str(f.status, "") === status)) &&
              (!severity || str(f.severity, "") === severity),
          );
          const selected = items.find((f) => str(f.flagId) === selectedId) ?? null;
          return (
            <>
              <StatRow>
                <StatTile label="New" value={int(isNew)} icon={<Siren size={20} />} />
                <StatTile label="Past SLA" value={int(overdue)} hint={overdue ? "Triage now" : "None overdue"} />
                <StatTile label="Escalated" value={int(escalated)} />
                <StatTile label="Flags shown" value={int(items.length)} hint="Latest 100" />
              </StatRow>
              <FilterBar>
                <Field label="Status" htmlFor="s-status" className="w-full sm:w-44">
                  <Select id="s-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ACTIVE">Needs action</option>
                    <option value="NEW">New</option>
                    <option value="TRIAGED">Triaged</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="CLOSED">Closed</option>
                    <option value="">All</option>
                  </Select>
                </Field>
                <Field label="Severity" htmlFor="s-sev" className="w-full sm:w-40">
                  <Select id="s-sev" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="">All</option>
                    {severities.map((s) => (
                      <option key={s} value={s}>
                        {humanise(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FilterBar>
              <QueueLayout
                list={
                  rows.length === 0 ? (
                    <EmptyState title="Nothing in this view" body="Choose another status or severity." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Flag</Th>
                          <Th>Category</Th>
                          <Th>Severity</Th>
                          <Th>Status</Th>
                          <Th>SLA</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((f) => {
                          const id = str(f.flagId);
                          const sla = slaInfo(f.slaDueAt);
                          return (
                            <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Flag ${str(f.flagRef)}`}>
                              <Td>
                                <span className="block font-semibold tabular">{str(f.flagRef)}</span>
                                <span className="text-caption text-neutral-600">{fmtDateTime(f.createdAt)}</span>
                              </Td>
                              <Td>{humanise(f.category)}</Td>
                              <Td>
                                <StatusBadge status={f.severity} />
                              </Td>
                              <Td>
                                <StatusBadge status={f.status} />
                              </Td>
                              <Td>{ACTIVE.has(str(f.status, "")) ? <Badge tone={sla.tone}>{sla.label}</Badge> : "—"}</Td>
                            </SelectableRow>
                          );
                        })}
                      </tbody>
                    </Table>
                  )
                }
                detail={
                  selected ? (
                    <FlagDetail
                      key={str(selected.flagId)}
                      flag={selected}
                      onDone={async (n) => {
                        setNote(n);
                        await state.reload();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select a flag to read the redacted excerpt and triage it." />
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

function FlagDetail({ flag, onDone }: { flag: Row; onDone: (n: Note) => Promise<void> }) {
  const id = str(flag.flagId);
  const [disposition, setDisposition] = useState("TRIAGED");
  const [triageNote, setTriageNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [summary, setSummary] = useState("Escalated from safety flag");
  const [busy, setBusy] = useState<null | "triage" | "escalate">(null);
  const [local, setLocal] = useState<Note>(null);
  const status = str(flag.status, "");
  const actionable = ACTIVE.has(status);

  async function triage(e: FormEvent) {
    e.preventDefault();
    if (disposition === "DISMISSED" && !triageNote.trim()) {
      setNoteError("Record why this flag is being dismissed.");
      return;
    }
    setNoteError(null);
    setBusy("triage");
    setLocal(null);
    try {
      await triageSafetyFlag(id, { disposition, note: triageNote.trim() });
      await onDone({ tone: "success", text: `Flag ${str(flag.flagRef)} marked ${humanise(disposition).toLowerCase()}.` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Could not update this flag.") });
    } finally {
      setBusy(null);
    }
  }

  async function escalate() {
    setBusy("escalate");
    setLocal(null);
    try {
      const r = await escalateSafetyFlag(id, { summary: summary.trim() || "Escalated from safety flag" });
      await onDone({
        tone: "success",
        text: `Flag ${str(flag.flagRef)} escalated. Safeguarding disclosure ${str(r.disclosureId).slice(0, 8)} opened with a 4-hour SLA.`,
      });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Could not escalate this flag.") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title={`Flag ${str(flag.flagRef)}`} description={humanise(flag.category)} action={<StatusBadge status={flag.status} />} />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Severity", <StatusBadge key="s" status={flag.severity} />],
            ["Raised", fmtDateTime(flag.createdAt)],
            ["SLA due", fmtDateTime(flag.slaDueAt)],
          ]}
        />
        <TextBlock label="Redacted excerpt" text={flag.excerptRedacted} emptyText="No excerpt stored." />
        <ResultNote note={local} />
        {actionable ? (
          <>
            <form onSubmit={triage} noValidate className="space-y-3 border-t border-neutral-100 pt-4">
              <Field label="Outcome" htmlFor="t-disp">
                <Select id="t-disp" value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                  <option value="TRIAGED">Triaged — keep monitoring</option>
                  <option value="DISMISSED">Dismiss — not a concern</option>
                  <option value="CLOSED">Close</option>
                </Select>
              </Field>
              <Field label="Note" htmlFor="t-note" hint="Recorded with your name in the audit trail." error={noteError}>
                <Textarea id="t-note" value={triageNote} onChange={(e) => setTriageNote(e.target.value)} className="min-h-[88px]" />
              </Field>
              <Button type="submit" variant="secondary" loading={busy === "triage"} className="w-full">
                Save outcome
              </Button>
            </form>
            <div className="border-t border-neutral-100 pt-4">
              {!escalating ? (
                <Button variant="destructive" className="w-full" onClick={() => setEscalating(true)} icon={<Siren size={18} />}>
                  Escalate to safeguarding
                </Button>
              ) : (
                <Callout tone="danger" title="Escalate this flag?">
                  <p>This reveals the learner&apos;s identity to the safeguarding team and opens a disclosure with a 4-hour SLA.</p>
                  <Field label="Summary" htmlFor="esc-summary" className="mt-3">
                    <Textarea id="esc-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-[72px] bg-white" />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" loading={busy === "escalate"} onClick={() => void escalate()}>
                      Yes, escalate
                    </Button>
                    <Button size="sm" variant="tertiary" onClick={() => setEscalating(false)} disabled={busy === "escalate"}>
                      Cancel
                    </Button>
                  </div>
                </Callout>
              )}
            </div>
          </>
        ) : (
          <Callout tone="neutral">This flag is {humanise(status).toLowerCase()}. No further action is needed here.</Callout>
        )}
      </CardBody>
    </Card>
  );
}
