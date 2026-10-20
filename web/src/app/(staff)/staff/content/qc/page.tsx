"use client";

import { useState } from "react";
import { ArrowClockwise, Check, Sparkle, X } from "@phosphor-icons/react";
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
  Th,
} from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import {
  DataState,
  DetailPlaceholder,
  FilterBar,
  QueueLayout,
  ResultNote,
  SectionTitle,
  SelectableRow,
  StatRow,
  StatusBadge,
  actionError,
  useApi,
  type Note,
} from "@/components/staff/ops";
import { TextBlock } from "@/components/staff/marking";
import { fmtDateTime, humanise, int, num, parseJson, pointText, str, type Row } from "@/components/staff/format";
import { approveQc, createGenerationRun, generationCoverage, listQcExceptions, rejectQc } from "@/lib/api/staff";
import { getQcExceptionDetail } from "@/lib/api/staff-ops";

const FORBIDDEN = "Question QC is for content admins. Ask a content lead for access.";

/** E-01 — AI question QC exceptions (content admin). */
export default function QcPage() {
  const state = useApi<Row[]>(async () => (await listQcExceptions()).items);
  // Coverage is supplementary: a failure here must not hide the queue.
  const coverage = useApi<Row>(() => generationCoverage(), { enabled: !state.problem?.forbidden });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function reloadAll() {
    await Promise.all([state.reload(), coverage.reload()]);
  }

  async function startRun() {
    setRunning(true);
    setNote(null);
    try {
      const run = await createGenerationRun();
      const st = str(run.status, "");
      setNote({
        tone: st === "FAILED" || st === "QC_FAILED" ? "warning" : "success",
        text: `Generation run ${str(run.runId).slice(0, 8)} ${st ? humanise(st).toLowerCase() : "started"}.${
          run.questionId != null ? ` New question #${str(run.questionId)} is in the queue.` : ""
        }`,
      });
      await reloadAll();
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Run failed") });
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Question QC"
        description="AI-generated and authored questions waiting for QC, or that failed automated checks. Approve to publish, reject to remove."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reloadAll()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
              Refresh
            </Button>
            <Button onClick={() => void startRun()} loading={running} icon={<Sparkle size={18} />} disabled={!!state.problem?.forbidden}>
              Start generation run
            </Button>
          </>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />
      <DataState
        state={state}
        forbiddenBody={FORBIDDEN}
        errorTitle="Could not load the QC queue"
        isEmpty={(d) => d.length === 0}
        emptyTitle="Queue empty"
        emptyBody="No QC exceptions. Start a generation run to create new questions."
      >
        {(items) => {
          const pending = items.filter((q) => str(q.reviewStatus, "") === "PENDING_QC").length;
          const failed = items.filter((q) => str(q.reviewStatus, "") === "QC_FAILED").length;
          const types = Array.from(new Set(items.map((q) => str(q.questionType, "")).filter(Boolean))).sort();
          const rows = items.filter(
            (q) => (!status || str(q.reviewStatus, "") === status) && (!type || str(q.questionType, "") === type),
          );
          const selected = items.find((q) => str(q.questionId) === selectedId) ?? null;
          return (
            <>
              <StatRow cols={3}>
                <StatTile label="In queue" value={int(items.length)} />
                <StatTile label="Pending QC" value={int(pending)} />
                <StatTile label="Failed checks" value={int(failed)} hint={failed ? "Review the failing checks" : undefined} />
              </StatRow>
              <FilterBar>
                <Field label="Status" htmlFor="qc-status" className="w-full sm:w-44">
                  <Select id="qc-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="PENDING_QC">Pending QC</option>
                    <option value="QC_FAILED">QC failed</option>
                  </Select>
                </Field>
                <Field label="Question type" htmlFor="qc-type" className="w-full sm:w-52">
                  <Select id="qc-type" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">All types</option>
                    {types.map((t) => (
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
                    <EmptyState title="Nothing in this view" body="Choose another status or type." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Question</Th>
                          <Th>Type</Th>
                          <Th className="text-right">Marks</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((q) => {
                          const id = str(q.questionId);
                          return (
                            <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Question ${id}`}>
                              <Td className="max-w-[320px]">
                                <span className="block text-caption font-semibold text-neutral-600 tabular">#{id}</span>
                                <span className="line-clamp-2 text-[14px]">{str(q.questionText)}</span>
                              </Td>
                              <Td>{humanise(q.questionType)}</Td>
                              <Td className="text-right tabular">{int(q.marksAvailable)}</Td>
                              <Td>
                                <StatusBadge status={q.reviewStatus} />
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
                    <QcDetail
                      key={str(selected.questionId)}
                      question={selected}
                      onDone={async (n) => {
                        setNote(n);
                        setSelectedId(null);
                        await reloadAll();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select a question to read it, see its QC checks and approve or reject it." />
                  )
                }
              />
            </>
          );
        }}
      </DataState>

      {!state.problem?.forbidden && <CoverageSection coverage={coverage} />}
    </AppPage>
  );
}

type SchemePoint = { id?: string; marks?: number; point?: string; accept?: string[] };
type Option = { id?: string; key?: string; label?: string; text?: string; correct?: boolean };

/** Options with the expected answer, mark scheme and model answer — what a reviewer judges the item against. */
function ReviewContent({ d }: { d: Row }) {
  const optsRaw = parseJson(d.optionsJson);
  const options: Option[] = Array.isArray(optsRaw) ? (optsRaw as Option[]) : [];
  const spec = parseJson(d.answerSpecJson) as Record<string, unknown> | null;
  const correct = spec && typeof spec === "object" ? String(spec.correctKey ?? spec.correct ?? spec.value ?? "") : "";
  const ptsRaw = parseJson(d.markingPointsJson);
  const points: SchemePoint[] = Array.isArray(ptsRaw)
    ? (ptsRaw as SchemePoint[])
    : Array.isArray((ptsRaw as { marking_points?: unknown } | null)?.marking_points)
      ? ((ptsRaw as { marking_points: SchemePoint[] }).marking_points)
      : [];
  const model = typeof d.modelAnswer === "string" && d.modelAnswer ? d.modelAnswer : null;
  if (options.length === 0 && points.length === 0 && !model && !correct) return null;
  return (
    <div className="space-y-3">
      {options.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">Options</p>
          <ul className="space-y-1">
            {options.map((o, i) => {
              const key = String(o.id ?? o.key ?? String.fromCharCode(65 + i));
              const right = o.correct === true || (correct !== "" && key.toUpperCase() === correct.toUpperCase());
              return (
                <li
                  key={key}
                  className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[14px] ${right ? "border-answer-correct/40 bg-[#E7F4EC]" : "border-neutral-200"}`}
                >
                  <span className="font-semibold">{key}</span>
                  <span className="flex-1">{String(o.text ?? o.label ?? "")}</span>
                  {right && <Badge tone="success">Answer</Badge>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {options.length === 0 && correct && (
        <KeyValue items={[["Expected answer", correct]]} />
      )}
      {points.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">Mark scheme</p>
          <ul className="space-y-1.5 text-[14px] text-neutral-800">
            {points.map((p, i) => (
              <li key={p.id ?? i}>
                <span className="font-semibold">{p.id ?? `M${i + 1}`}</span> ({p.marks ?? 1}) — {p.point}
                {p.accept && p.accept.length > 0 && <span className="text-neutral-600"> · Accept: {p.accept.join("; ")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {model && <TextBlock label="Model answer" text={model} />}
    </div>
  );
}

function QcDetail({ question, onDone }: { question: Row; onDone: (n: Note) => Promise<void> }) {
  const id = str(question.questionId);
  const detail = useApi<Row>(() => getQcExceptionDetail(id), { key: id });
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [local, setLocal] = useState<Note>(null);
  const checks = Array.isArray(detail.data?.qcChecks) ? (detail.data?.qcChecks as Row[]) : [];

  async function act(kind: "approve" | "reject") {
    setBusy(kind);
    setLocal(null);
    try {
      if (kind === "approve") await approveQc(id);
      else await rejectQc(id);
      await onDone({ tone: "success", text: kind === "approve" ? `Approved ${id}` : `Rejected ${id}` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, kind === "approve" ? "Approve failed" : "Reject failed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title={`Question #${id}`} description={humanise(question.questionType)} action={<StatusBadge status={question.reviewStatus} />} />
      <CardBody className="space-y-4">
        <TextBlock label="Question" text={question.questionText} />
        {detail.data && <ReviewContent d={detail.data} />}
        <KeyValue
          items={[
            ["Marks", int(question.marksAvailable)],
            ["Specification", detail.data?.specTitle ? str(detail.data.specTitle) : str(question.specificationId)],
            [
              "Topic",
              detail.data?.topicName
                ? `${detail.data.topicNumber ? `${str(detail.data.topicNumber)} ` : ""}${str(detail.data.topicName)}`
                : str(question.topicId),
            ],
            ["Source", humanise(question.sourceType)],
            ["Reference", <span key="r" className="break-all">{str(question.sourceReference)}</span>],
          ]}
        />
        <div>
          <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">QC checks</p>
          {detail.problem && !detail.data ? (
            <p className="text-[14px] text-answer-incorrect">{detail.problem.message}</p>
          ) : !detail.data ? (
            <LoadingState lines={2} />
          ) : checks.length === 0 ? (
            <p className="text-[14px] text-neutral-600">No automated checks have run on this question.</p>
          ) : (
            <ul className="space-y-2">
              {checks.map((c) => {
                const issues = parseJson(c.issuesJson);
                const list = Array.isArray(issues) ? issues : [];
                const score = num(c.score);
                return (
                  <li key={str(c.resultId)} className="rounded-md border border-neutral-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[13px]">{str(c.checkId)}</span>
                      <span className="flex items-center gap-2">
                        {score !== null && <span className="text-caption tabular text-neutral-600">{score.toFixed(2)}</span>}
                        {c.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="danger">Failed</Badge>}
                      </span>
                    </div>
                    {list.length > 0 && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] text-neutral-700">
                        {list.map((iss, i) => (
                          <li key={i}>{pointText(iss)}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1 text-caption text-neutral-600">{fmtDateTime(c.runAt)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <ResultNote note={local} />
        <div className="space-y-2 border-t border-neutral-100 pt-4">
          {!confirmReject ? (
            <div className="grid grid-cols-2 gap-2">
              <Button icon={<Check size={18} />} loading={busy === "approve"} onClick={() => void act("approve")} disabled={busy !== null}>
                Approve
              </Button>
              <Button variant="secondary" icon={<X size={18} />} onClick={() => setConfirmReject(true)} disabled={busy !== null}>
                Reject
              </Button>
            </div>
          ) : (
            <Callout tone="danger" title="Reject this question?">
              <p>It will be removed from the question bank and will not be served to pupils.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" loading={busy === "reject"} onClick={() => void act("reject")}>
                  Yes, reject
                </Button>
                <Button size="sm" variant="tertiary" onClick={() => setConfirmReject(false)} disabled={busy === "reject"}>
                  Cancel
                </Button>
              </div>
            </Callout>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function CoverageSection({ coverage }: { coverage: { data: Row | null; problem: { message: string } | null } }) {
  const byTopic = Array.isArray(coverage.data?.byTopic) ? (coverage.data?.byTopic as Row[]) : [];
  const sorted = [...byTopic].sort((a, b) => (num(a.approvedCount) ?? 0) - (num(b.approvedCount) ?? 0));
  const total = byTopic.reduce((s, t) => s + (num(t.approvedCount) ?? 0), 0);
  return (
    <>
      <SectionTitle title="Approved coverage" description="Approved questions per topic, thinnest first. Generation runs target the gaps." />
      {coverage.problem && !coverage.data ? (
        <Callout tone="danger" title="Could not load coverage">
          {coverage.problem.message}
        </Callout>
      ) : !coverage.data ? (
        <LoadingState label="Loading coverage…" lines={2} />
      ) : byTopic.length === 0 ? (
        <EmptyState title="No approved questions yet" body="Coverage appears once questions are approved." />
      ) : (
        <Card>
          <CardHeader title={`${int(total)} approved questions`} description={`Across ${int(byTopic.length)} topics`} />
          <CardBody className="p-0">
            <Table className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Topic</Th>
                  <Th className="text-right">Approved questions</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 12).map((t) => (
                  <tr key={str(t.topicId)}>
                    <Td>Topic {str(t.topicId)}</Td>
                    <Td className="text-right tabular">{int(t.approvedCount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </>
  );
}
