"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, HandGrabbing } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Input,
  KeyValue,
  PageHeader,
  Select,
  StatTile,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
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
import { MarkingPoints, TextBlock } from "@/components/staff/marking";
import { fmtDateTime, humanise, int, num, parseJson, shortId, slaInfo, str, type Row } from "@/components/staff/format";
import { claimException, listExceptions, resolveException } from "@/lib/api/practice";
import { getExceptionDetail } from "@/lib/api/staff-ops";

type Exception = { exceptionId: string; responseId: string; trigger: string; status: string; slaDueAt?: string | null };

const RESOLUTIONS = [
  { value: "UPHELD", label: "Upheld — AI mark stands" },
  { value: "ADJUSTED_UP", label: "Adjusted up" },
  { value: "ADJUSTED_DOWN", label: "Adjusted down" },
  { value: "SCHEME_GAP", label: "Mark scheme gap" },
] as const;

/** F-10 — Marking exceptions queue (OPS). */
export default function StaffExceptionsPage() {
  const state = useApi<Exception[]>(async () => (await listExceptions()).items);
  const [status, setStatus] = useState("OPEN_OR_IN_PROGRESS");
  const [trigger, setTrigger] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Marking"
        title="Marking exceptions"
        description="Low-confidence marks, pass disagreements, disputes and schema failures that need a person to decide."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />
      <DataState
        state={state}
        forbiddenBody="The exceptions queue is for marking operations staff. Ask an ops lead for access."
        errorTitle="Could not load exceptions"
        isEmpty={(d) => d.length === 0}
        emptyTitle="Queue empty"
        emptyBody="No open marking exceptions."
      >
        {(items) => {
          const open = items.filter((e) => e.status === "OPEN").length;
          const inProgress = items.filter((e) => e.status === "IN_PROGRESS").length;
          const overdue = items.filter((e) => e.status !== "RESOLVED" && slaInfo(e.slaDueAt).tone === "danger").length;
          const triggers = Array.from(new Set(items.map((e) => e.trigger))).sort();
          const rows = items.filter(
            (e) =>
              (status === "" || (status === "OPEN_OR_IN_PROGRESS" ? e.status !== "RESOLVED" : e.status === status)) &&
              (!trigger || e.trigger === trigger),
          );
          const selected = items.find((e) => e.exceptionId === selectedId) ?? null;
          return (
            <>
              <StatRow>
                <StatTile label="Open" value={int(open)} />
                <StatTile label="In progress" value={int(inProgress)} />
                <StatTile label="Past SLA" value={int(overdue)} hint={overdue ? "Prioritise these" : "None overdue"} />
                <StatTile label="Resolved (recent)" value={int(items.length - open - inProgress)} />
              </StatRow>
              <FilterBar>
                <Field label="Status" htmlFor="x-status" className="w-full sm:w-48">
                  <Select id="x-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="OPEN_OR_IN_PROGRESS">Needs action</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="">All</option>
                  </Select>
                </Field>
                <Field label="Trigger" htmlFor="x-trigger" className="w-full sm:w-52">
                  <Select id="x-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                    <option value="">All triggers</option>
                    {triggers.map((t) => (
                      <option key={t} value={t}>
                        {humanise(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FilterBar>
              <QueueLayout
                list={
                  rows.length === 0 ? (
                    <EmptyState title="Nothing in this view" body="Choose another status or trigger." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Exception</Th>
                          <Th>Trigger</Th>
                          <Th>Status</Th>
                          <Th>SLA</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((ex) => {
                          const sla = slaInfo(ex.slaDueAt);
                          return (
                            <SelectableRow
                              key={ex.exceptionId}
                              selected={ex.exceptionId === selectedId}
                              onSelect={() => setSelectedId(ex.exceptionId)}
                              label={`Exception ${shortId(ex.exceptionId)}`}
                            >
                              <Td>
                                <span className="block font-semibold tabular">{shortId(ex.exceptionId)}</span>
                                <span className="text-caption text-neutral-600 tabular">Response {shortId(ex.responseId)}</span>
                              </Td>
                              <Td>{humanise(ex.trigger)}</Td>
                              <Td>
                                <StatusBadge status={ex.status} />
                              </Td>
                              <Td>{ex.status === "RESOLVED" ? "—" : <Badge tone={sla.tone}>{sla.label}</Badge>}</Td>
                            </SelectableRow>
                          );
                        })}
                      </tbody>
                    </Table>
                  )
                }
                detail={
                  selected ? (
                    <ExceptionDetail
                      key={selected.exceptionId}
                      ex={selected}
                      onDone={async (n) => {
                        setNote(n);
                        await state.reload();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select an exception to see the answer, mark scheme and resolution options." />
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

function ExceptionDetail({ ex, onDone }: { ex: Exception; onDone: (n: Note) => Promise<void> }) {
  const detail = useApi<Row>(() => getExceptionDetail(ex.exceptionId), { key: ex.exceptionId });
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolution, setResolution] = useState<string>("UPHELD");
  const [marks, setMarks] = useState("");
  const [resNote, setResNote] = useState("");
  const [addToGold, setAddToGold] = useState(true);
  const [marksError, setMarksError] = useState<string | null>(null);
  const [local, setLocal] = useState<Note>(null);

  const available = num(detail.data?.marksAvailable);
  const original = num(detail.data?.originalMarks);

  useEffect(() => {
    if (original !== null) setMarks(String(original));
  }, [original]);

  async function claim() {
    setClaiming(true);
    setLocal(null);
    try {
      await claimException(ex.exceptionId);
      await onDone({ tone: "success", text: `Claimed exception ${shortId(ex.exceptionId)}.` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Claim failed") });
    } finally {
      setClaiming(false);
    }
  }

  async function resolve(e: FormEvent) {
    e.preventDefault();
    const m = Number(marks);
    if (marks.trim() === "" || !Number.isFinite(m) || m < 0 || (available !== null && m > available)) {
      setMarksError(available !== null ? `Enter a mark from 0 to ${available}.` : "Enter a mark of 0 or more.");
      return;
    }
    setMarksError(null);
    setSaving(true);
    setLocal(null);
    try {
      await resolveException(ex.exceptionId, {
        finalMarks: m,
        resolution,
        resolutionNote: resNote.trim() || undefined,
        addToGold,
      });
      await onDone({ tone: "success", text: `Resolved exception ${shortId(ex.exceptionId)} (${humanise(resolution)}, ${m} marks).` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Resolve failed") });
    } finally {
      setSaving(false);
    }
  }

  const resolved = ex.status === "RESOLVED";

  return (
    <Card>
      <CardHeader
        title={`Exception ${shortId(ex.exceptionId)}`}
        description={humanise(ex.trigger)}
        action={<StatusBadge status={ex.status} />}
      />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Response", <span key="r" className="tabular">{shortId(ex.responseId)}</span>],
            ["SLA due", fmtDateTime(ex.slaDueAt)],
            ["AI mark", detail.data ? `${str(detail.data.originalMarks)} / ${str(detail.data.marksAvailable)}` : "…"],
          ]}
        />
        {detail.problem && !detail.data ? (
          <ResultNote note={{ tone: "danger", text: detail.problem.message }} />
        ) : !detail.data ? (
          <LoadingState lines={4} />
        ) : (
          <>
            <TextBlock label="Question" text={detail.data.questionText} />
            <TextBlock label="Pupil answer" text={detail.data.answerText} />
            <MarkingPoints json={detail.data.schemeJson} />
            <AiPasses results={detail.data.aiResults} />
          </>
        )}
        <ResultNote note={local} />
        {!resolved && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            {ex.status === "OPEN" && (
              <Button variant="secondary" onClick={() => void claim()} loading={claiming} icon={<HandGrabbing size={18} />} className="w-full">
                Claim
              </Button>
            )}
            <form onSubmit={resolve} noValidate className="space-y-4">
              <Field label="Resolution" htmlFor="res-kind">
                <Select id="res-kind" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  {RESOLUTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Final marks"
                htmlFor="res-marks"
                hint={available !== null ? `Out of ${available}` : undefined}
                error={marksError}
              >
                <Input
                  id="res-marks"
                  type="number"
                  min={0}
                  max={available ?? undefined}
                  step="0.5"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  className="tabular"
                />
              </Field>
              <Field label="Resolution note" htmlFor="res-note" hint="Optional. Explain the decision for the audit trail.">
                <Textarea id="res-note" value={resNote} onChange={(e) => setResNote(e.target.value)} className="min-h-[88px]" />
              </Field>
              <Checkbox label="Add to the gold set for future evaluation" checked={addToGold} onChange={(e) => setAddToGold(e.target.checked)} />
              <Button type="submit" loading={saving} className="w-full">
                Resolve exception
              </Button>
            </form>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** Each AI marking pass with its per-point decision and quoted evidence. */
function AiPasses({ results }: { results: unknown }) {
  const passes = Array.isArray(results) ? (results as Row[]) : [];
  if (passes.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">AI marking</p>
      <ul className="space-y-2">
        {passes.map((r, i) => {
          const raw = parseJson(r.pointsJson);
          const points = (Array.isArray(raw) ? (raw as Row[]) : []).filter((p) => str(p.id, "") !== "FLAGS");
          const conf = num(r.confidence);
          return (
            <li key={i} className="rounded-md border border-neutral-200 px-3 py-2 text-[14px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{humanise(r.kind)}</span>
                <span className="tabular text-neutral-700">
                  {str(r.marksTotal)}
                  {conf !== null && <span className="ml-2 text-caption text-neutral-600">conf {conf.toFixed(2)}</span>}
                </span>
              </div>
              {points.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {points.map((p, j) => (
                    <li key={j} className="text-[13px] text-neutral-700">
                      <span className="font-semibold">{str(p.id)}</span> {str(p.awarded, "0")}/{str(p.max, "1")}
                      {str(p.evidence, "") && str(p.evidence, "") !== "local_stub" && (
                        <span className="italic text-neutral-600"> — “{str(p.evidence)}”</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
