"use client";

import { useState, type FormEvent } from "react";
import { ArrowClockwise, ArrowUUpLeft, Check, HandGrabbing, PencilSimple } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
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
  useAccessToken,
  useApi,
  type Note,
} from "@/components/staff/ops";
import { MarkingPoints, TextBlock } from "@/components/staff/marking";
import { fmtDateTime, humanise, int, num, pct, str, type Row } from "@/components/staff/format";
import type { Tone } from "@/components/ui/primitives";
import * as api from "@/lib/api/w3";
import { releaseReview } from "@/lib/api/staff-ops";

type Workbench = { queue: Row[]; sla: Row; accuracyClaims: string };

const SLA_TONE: Record<string, Tone> = { GREEN: "success", AMBER: "warning", RED: "danger" };

/** F-05 — A-Level review workbench. Pseudonymous queue only — no learner identity. */
export default function ReviewWorkbenchPage() {
  const { token, ready } = useAccessToken();
  const state = useApi<Workbench>(
    async () => {
      const queue = (await api.reviewQueue(token)) as Row | Row[] | null;
      const sla = ((await api.reviewSla(token)) ?? {}) as Row;
      const items = Array.isArray(queue) ? queue : Array.isArray(queue?.items) ? (queue?.items as Row[]) : [];
      return { queue: items, sla, accuracyClaims: "unvalidated" };
    },
    { enabled: ready, key: token },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState<Note>(null);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Marking"
        title="A-Level review workbench"
        description="Second-mark AI-marked A-Level answers. References are pseudonymous; learner identity is never shown."
        actions={
          <Button variant="secondary" onClick={() => void state.reload()} loading={state.loading && !!state.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />
      <DataState
        state={state}
        forbiddenBody="The review workbench is for A-Level reviewers. Ask an ops lead to add the reviewer role."
        errorTitle="Could not load the review queue"
      >
        {({ queue, sla }) => {
          const rows = queue.filter((r) => !status || str(r.status, "") === status);
          const selected = queue.find((r) => str(r.reviewId) === selectedId) ?? null;
          return (
            <>
              <StatRow cols={5}>
                <StatTile label="Queued" value={int(sla.queued)} />
                <StatTile label="Claimed" value={int(sla.claimed)} />
                <StatTile label="Past SLA" value={int(sla.breached)} hint={`SLA ${int(sla.slaHours)}h`} />
                <StatTile label="Decided" value={int(sla.decided)} />
                <StatTile label="AI agreement" value={Number(sla.decided ?? 0) > 0 ? pct(sla.agreementRate, 0) : "—"} hint="Unvalidated — not an accuracy claim" />
              </StatRow>
              <FilterBar>
                <Field label="Status" htmlFor="r-status" className="w-full sm:w-44">
                  <Select id="r-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Queued and claimed</option>
                    <option value="QUEUED">Queued</option>
                    <option value="CLAIMED">Claimed</option>
                  </Select>
                </Field>
              </FilterBar>
              <QueueLayout
                list={
                  rows.length === 0 ? (
                    <EmptyState title="Queue empty" body="No answers are waiting for review." />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Reference</Th>
                          <Th>Status</Th>
                          <Th className="text-right">AI mark</Th>
                          <Th>SLA</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const id = str(r.reviewId);
                          const hours = num(r.hoursRemaining);
                          return (
                            <SelectableRow
                              key={id}
                              selected={id === selectedId}
                              onSelect={() => setSelectedId(id)}
                              label={`Review ${str(r.anonymousRef)}`}
                            >
                              <Td className="font-semibold tabular">{str(r.anonymousRef)}</Td>
                              <Td>
                                <StatusBadge status={r.status} />
                              </Td>
                              <Td className="text-right tabular">{str(r.aiMarks)}</Td>
                              <Td>
                                <Badge tone={SLA_TONE[str(r.slaColour, "")] ?? "neutral"}>
                                  {hours === null ? "—" : hours < 0 ? `Overdue ${Math.abs(hours)}h` : `${hours}h left`}
                                </Badge>
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
                    <ReviewDetail
                      key={str(selected.reviewId)}
                      reviewId={str(selected.reviewId)}
                      token={token}
                      queueStatus={str(selected.status, "")}
                      onChanged={async (n, keepSelected) => {
                        setNote(n);
                        if (!keepSelected) setSelectedId(null);
                        await state.reload();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select a reference to read the answer, mark scheme and AI marking trail." />
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

function ReviewDetail({
  reviewId,
  token,
  queueStatus,
  onChanged,
}: {
  reviewId: string;
  token: string | undefined;
  queueStatus: string;
  onChanged: (n: Note, keepSelected?: boolean) => Promise<void>;
}) {
  const detail = useApi<Row>(async () => ((await api.reviewDetail(reviewId, token)) ?? {}) as Row, { key: reviewId });
  const [busy, setBusy] = useState<null | "claim" | "confirm" | "adjust" | "release">(null);
  const [mode, setMode] = useState<"none" | "confirm" | "adjust">("none");
  const [marks, setMarks] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ marks?: string; reason?: string }>({});
  const [local, setLocal] = useState<Note>(null);

  const d = detail.data;
  const status = str(d?.status, queueStatus);
  const available = num(d?.marksAvailable);
  const aiMarks = num(d?.aiMarks);
  const trail = Array.isArray(d?.markingTrail) ? (d?.markingTrail as Row[]) : [];

  async function act(kind: "claim" | "confirm" | "release", fn: () => Promise<unknown>, success: string, keep: boolean) {
    setBusy(kind);
    setLocal(null);
    try {
      await fn();
      if (keep) await detail.reload();
      setMode("none");
      await onChanged({ tone: "success", text: success }, keep);
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, `Could not ${kind} this review.`) });
    } finally {
      setBusy(null);
    }
  }

  async function adjust(e: FormEvent) {
    e.preventDefault();
    const m = Number(marks);
    const next: typeof errors = {};
    if (marks.trim() === "" || !Number.isFinite(m) || m < 0 || (available !== null && m > available)) {
      next.marks = available !== null ? `Enter a mark from 0 to ${available}.` : "Enter a mark of 0 or more.";
    } else if (aiMarks !== null && m === aiMarks) {
      next.marks = "This matches the AI mark. Use Confirm instead.";
    }
    if (!reason.trim()) next.reason = "Give a short reason for the adjustment.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy("adjust");
    setLocal(null);
    try {
      await api.adjustReview(reviewId, { finalMarks: m, reason: reason.trim() }, token);
      setMode("none");
      await onChanged({ tone: "success", text: `Adjusted ${str(d?.anonymousRef, "review")} to ${m} marks.` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Could not adjust this review.") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title={str(d?.anonymousRef, "Review")}
        description={d ? humanise(d.questionType) : "Loading…"}
        action={<StatusBadge status={status} />}
      />
      <CardBody className="space-y-4">
        {detail.problem && !d ? (
          <ResultNote note={{ tone: "danger", text: detail.problem.message }} />
        ) : !d ? (
          <LoadingState lines={5} />
        ) : (
          <>
            <KeyValue
              items={[
                ["AI mark", <span key="a" className="tabular">{`${str(d.aiMarks)} / ${str(d.marksAvailable)}`}</span>],
                ["Final mark", <span key="f" className="tabular">{str(d.finalMarks, "Not decided")}</span>],
                ["Due", fmtDateTime(d.dueAt)],
                ["Learner identity", <Badge key="i">Redacted</Badge>],
              ]}
            />
            <TextBlock label="Question" text={d.questionText} />
            <TextBlock label="Answer" text={d.answerText} />
            <MarkingPoints json={d.schemePointsJson} />
            {str(d.modelAnswer, "") && <TextBlock label="Model answer" text={d.modelAnswer} />}
            {trail.length > 0 && (
              <div>
                <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-neutral-600">AI marking trail</p>
                <Table>
                  <thead>
                    <tr>
                      <Th>Pass</Th>
                      <Th className="text-right">Marks</Th>
                      <Th className="text-right">Confidence</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {trail.map((t, i) => (
                      <tr key={i}>
                        <Td>{humanise(t.kind)}</Td>
                        <Td className="text-right tabular">{str(t.marksTotal)}</Td>
                        <Td className="text-right tabular">{num(t.confidence) === null ? "—" : pct(t.confidence, 0)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
            {str(d.decisionNote, "") && <TextBlock label="Decision note" text={d.decisionNote} />}
          </>
        )}

        <ResultNote note={local} />

        {status === "QUEUED" && (
          <Button
            className="w-full"
            icon={<HandGrabbing size={18} />}
            loading={busy === "claim"}
            onClick={() => void act("claim", () => api.claimReview(reviewId, token), `Claimed ${str(d?.anonymousRef, "review")}.`, true)}
          >
            Claim for review
          </Button>
        )}

        {status === "CLAIMED" && (
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            {mode === "none" && (
              <div className="grid grid-cols-2 gap-2">
                <Button icon={<Check size={18} />} onClick={() => setMode("confirm")}>
                  Confirm AI mark
                </Button>
                <Button
                  variant="secondary"
                  icon={<PencilSimple size={18} />}
                  onClick={() => {
                    setMarks(aiMarks === null ? "" : String(aiMarks));
                    setMode("adjust");
                  }}
                >
                  Adjust
                </Button>
                <Button
                  variant="tertiary"
                  className="col-span-2"
                  icon={<ArrowUUpLeft size={18} />}
                  loading={busy === "release"}
                  onClick={() => void act("release", () => releaseReview(reviewId, token), "Returned to the queue.", false)}
                >
                  Release back to queue
                </Button>
              </div>
            )}

            {mode === "confirm" && (
              <Callout tone="warning" title="Confirm the AI mark?">
                <p>
                  The pupil&apos;s final mark becomes <strong className="tabular">{str(d?.aiMarks)}</strong> out of{" "}
                  <span className="tabular">{str(d?.marksAvailable)}</span>. This updates their progress.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={busy === "confirm"}
                    onClick={() =>
                      void act("confirm", () => api.confirmReview(reviewId, token), `Confirmed the AI mark for ${str(d?.anonymousRef, "review")}.`, false)
                    }
                  >
                    Yes, confirm
                  </Button>
                  <Button size="sm" variant="tertiary" onClick={() => setMode("none")} disabled={busy === "confirm"}>
                    Cancel
                  </Button>
                </div>
              </Callout>
            )}

            {mode === "adjust" && (
              <form onSubmit={adjust} noValidate className="space-y-3">
                <Field label="Final marks" htmlFor="adj-marks" hint={available !== null ? `Out of ${available}` : undefined} error={errors.marks}>
                  <Input
                    id="adj-marks"
                    type="number"
                    min={0}
                    max={available ?? undefined}
                    step="0.5"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field label="Reason" htmlFor="adj-reason" error={errors.reason}>
                  <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[88px]" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={busy === "adjust"}>
                    Save adjusted mark
                  </Button>
                  <Button type="button" variant="tertiary" onClick={() => setMode("none")} disabled={busy === "adjust"}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
