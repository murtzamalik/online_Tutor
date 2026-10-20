"use client";

import { useState } from "react";
import { Database, Play, Target } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardBody, CardHeader, KeyValue, PageHeader, StatTile, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { DataState, Meter, ResultNote, SectionTitle, StatRow, actionError, useApi, type Note } from "@/components/staff/ops";
import { fmtDateTime, int, isRecord, num, pct, shortId, str, type Row } from "@/components/staff/format";
import { evalSummary, listGold, runEval } from "@/lib/api/staff";
import { listEvalRuns } from "@/lib/api/staff-ops";

const GATE = 0.95;

type Overview = { summary: Row; gold: { total: number; targetSize: number } };

/** Q-01 — AI evaluation harness (AI engineer / owner). */
export default function AiEvalPage() {
  const overview = useApi<Overview>(async () => {
    const summary = await evalSummary();
    const g = await listGold();
    return { summary, gold: { total: g.total, targetSize: g.targetSize } };
  });
  const runs = useApi<Row[]>(async () => (await listEvalRuns()).items);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<Note>(null);

  async function onRun() {
    setRunning(true);
    setNote(null);
    try {
      const r = await runEval();
      const failed = num(r.failedItems) ?? 0;
      setNote({
        tone: failed > 0 ? "warning" : "success",
        text: `Evaluation ${shortId(r.evalId)} finished: ${int(r.nItems)} ${Number(r.nItems) === 1 ? "item" : "items"} scored, point accuracy ${pct(r.pointAccuracy)}, exact total agreement ${pct(r.exactTotalAgreement)}${failed > 0 ? `, ${failed} ${failed === 1 ? "item" : "items"} could not be marked` : ""}.`,
      });
      await Promise.all([overview.reload(), runs.reload()]);
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Eval failed") });
    } finally {
      setRunning(false);
    }
  }

  const forbidden = "The evaluation harness is for AI engineers and the product owner.";

  return (
    <AppPage>
      <PageHeader
        eyebrow="AI operations"
        title="AI evaluation"
        description="Marking accuracy against the examiner-marked gold set. Promotion gate: point accuracy of at least 95% with every item scored."
        actions={
          <Button onClick={() => void onRun()} loading={running} icon={<Play size={18} weight="fill" />} disabled={!!overview.problem?.forbidden}>
            Run evaluation
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />

      <DataState state={overview} forbiddenBody={forbidden} errorTitle="Could not load the evaluation summary">
        {({ summary, gold }) => {
          const lr = summary.latestRun;
          const latest: Row = isRecord(lr) ? lr : {};
          const hasLatest = Object.keys(latest).length > 0;
          const acc = num(latest.pointAccuracy);
          const target = gold.targetSize || num(summary.targetGoldSize) || 0;
          return (
            <>
              <StatRow>
                <StatTile
                  label="Point accuracy"
                  value={hasLatest ? pct(acc) : "—"}
                  icon={<Target size={20} />}
                  hint={hasLatest ? (acc !== null && acc >= GATE ? "Meets the 95% gate" : "Below the 95% gate") : "No runs yet"}
                />
                <StatTile label="Exact total agreement" value={hasLatest ? pct(latest.exactTotalAgreement) : "—"} />
                <StatTile label="Items in last run" value={hasLatest ? int(latest.nItems) : "—"} hint={hasLatest ? fmtDateTime(latest.finishedAt) : undefined} />
                <StatTile label="Gold set" value={int(gold.total)} icon={<Database size={20} />} hint={`Target ${int(target)}`} />
              </StatRow>
              <Card className="mb-6">
                <CardBody>
                  <div className="mb-2 flex items-center justify-between text-[14px]">
                    <span className="font-semibold text-neutral-700">Gold set progress</span>
                    <span className="tabular text-neutral-600">
                      {int(gold.total)} / {int(target)} ({target ? pct(gold.total / target, 0) : "—"})
                    </span>
                  </div>
                  <Meter value={target ? gold.total / target : 0} tone="teal" label="Gold set progress" />
                </CardBody>
              </Card>
            </>
          );
        }}
      </DataState>

      {!overview.problem?.forbidden && (
        <>
          <SectionTitle title="Evaluation runs" description="Latest 50 runs, newest first." />
          {runs.problem && !runs.data ? (
            <ResultNote note={{ tone: runs.problem.forbidden ? "warning" : "danger", text: runs.problem.forbidden ? "Your role cannot list evaluation runs." : runs.problem.message }} />
          ) : !runs.data ? (
            <LoadingState label="Loading runs…" />
          ) : runs.data.length === 0 ? (
            <EmptyState title="No evaluation runs yet" body="Run an evaluation to score the live marking prompt against the gold set." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Started</Th>
                  <Th>Task</Th>
                  <Th>Model</Th>
                  <Th className="text-right">Items</Th>
                  <Th className="text-right">Point accuracy</Th>
                  <Th className="text-right">Exact total</Th>
                  <Th>Gate</Th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => {
                  const a = num(r.pointAccuracy);
                  const done = r.finishedAt != null;
                  return (
                    <tr key={str(r.evalId)}>
                      <Td className="whitespace-nowrap">
                        <span className="block tabular">{fmtDateTime(r.startedAt)}</span>
                        <span className="text-caption text-neutral-600 tabular">{shortId(r.evalId)}</span>
                      </Td>
                      <Td className="font-mono text-[13px]">{str(r.taskKey)}</Td>
                      <Td>{str(r.modelId)}</Td>
                      <Td className="text-right tabular">{int(r.nItems)}</Td>
                      <Td className="text-right">
                        <span className={a !== null && a >= GATE ? "font-semibold text-answer-correct tabular" : "font-semibold tabular"}>
                          {pct(a)}
                        </span>
                      </Td>
                      <Td className="text-right tabular">{pct(r.exactTotalAgreement)}</Td>
                      <Td>
                        {!done ? (
                          <Badge tone="info">Running</Badge>
                        ) : r.passesGate === true ? (
                          <Badge tone="success">Passes</Badge>
                        ) : r.passesGate === false ? (
                          <Badge tone="danger">Fails</Badge>
                        ) : (
                          <Badge>Not scored</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Card className="mt-6">
            <CardHeader title="How the gate works" />
            <CardBody>
              <KeyValue
                items={[
                  ["Headline metric", "Agreement per marking point"],
                  ["Promotion threshold", "95% point accuracy"],
                  ["Failed items", "Any failed item blocks the gate"],
                ]}
              />
            </CardBody>
          </Card>
        </>
      )}
    </AppPage>
  );
}
