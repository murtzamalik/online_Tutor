"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, Check, Sparkle, X } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, Field, KeyValue, PageHeader, Select, Table, Td, Th } from "@/components/ui/primitives";
import {
  DataState,
  DetailPlaceholder,
  FilterBar,
  QueueLayout,
  ResultNote,
  SectionTitle,
  SelectableRow,
  StatusBadge,
  actionError,
  useApi,
  type Note,
} from "@/components/staff/ops";
import { fmtDateTime, humanise, str, type Row } from "@/components/staff/format";
import { Markdown } from "@/components/student/Markdown";
import { listSpecifications, specTopics, type SpecTopic } from "@/lib/api/catalog";
import { approveRevisionNote, generateRevisionNotes, listRevisionNotes, rejectRevisionNote } from "@/lib/api/staff-ops";

type Spec = { specificationId: string; specCode: string; title: string };

const FORBIDDEN = "Revision notes are managed by content admins.";

/** Y10-11 / Y12-13 come from the generator; seeded rows may say GCSE. */
function readingLevel(v: unknown): string {
  const s = str(v, "");
  if (s === "Y10-11") return "GCSE (Y10-11)";
  if (s === "Y12-13") return "A-Level (Y12-13)";
  return humanise(s);
}

/** E-01 — Revision notes: generate with AI (P-RC-01), review each version, approve or reject (content admin). */
export default function RevisionNotesPage() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [specId, setSpecId] = useState("");
  const [topics, setTopics] = useState<SpecTopic[] | null>(null);
  const [topicId, setTopicId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    listSpecifications()
      .then((r) => {
        setSpecs(r.items.map((s) => ({ specificationId: String(s.specificationId), specCode: s.specCode, title: s.title ?? "" })));
        const aqa = r.items.find((s) => s.specCode === "8462") ?? r.items[0];
        if (aqa) setSpecId(String(aqa.specificationId));
      })
      .catch(() => undefined);
  }, []);

  // Top-level topics of the chosen specification (notes are generated per topic, sub-points included).
  useEffect(() => {
    if (!specId) return;
    setTopics(null);
    specTopics(specId)
      .then((r) => {
        const level1 = r.topics.filter((x) => (x.level ?? 1) === 1);
        setTopics(level1);
        setTopicId((cur) => (level1.some((x) => String(x.topicId) === cur) ? cur : String(level1[0]?.topicId ?? "")));
      })
      .catch(() => setTopics([]));
  }, [specId]);

  const notes = useApi<Row[]>(async () => (await listRevisionNotes(topicId)).items, { key: topicId, enabled: !!topicId });

  // Fresh topic: drop the previous topic's versions and selection so they never show under the wrong name.
  useEffect(() => {
    notes.setData(null);
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const forbidden = !!notes.problem?.forbidden;
  const topicName = topics?.find((t) => String(t.topicId) === topicId)?.name ?? "this topic";

  async function generate() {
    if (!topicId) return;
    setGenerating(true);
    setNote(null);
    try {
      const r = await generateRevisionNotes(Number(topicId));
      await notes.reload();
      if (r.noteId != null) setSelectedId(String(r.noteId));
      setNote({ tone: "success", text: `Generated version ${str(r.version)} for ${topicName}. Review it below, then approve or reject.` });
    } catch (err) {
      setNote({ tone: "danger", text: actionError(err, "Generation failed") });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Revision notes"
        description="Generate topic notes with AI, check them against the specification, and approve one version for students."
        actions={
          <Button
            variant="secondary"
            onClick={() => void notes.reload()}
            loading={notes.loading && !!notes.data}
            disabled={!topicId}
            icon={<ArrowClockwise size={18} />}
          >
            Refresh
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />

      {!forbidden && (
        <FilterBar>
          <Field label="Specification" htmlFor="n-spec" className="min-w-[220px] flex-1">
            <Select id="n-spec" value={specId} onChange={(e) => setSpecId(e.target.value)} disabled={specs.length === 0 || generating}>
              {specs.length === 0 && <option value="">Loading specifications…</option>}
              {specs.map((s) => (
                <option key={s.specificationId} value={s.specificationId}>
                  {s.specCode}
                  {s.title ? ` — ${s.title}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Topic" htmlFor="n-topic" className="min-w-[220px] flex-1">
            <Select
              id="n-topic"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={!topics || topics.length === 0 || generating}
            >
              {!topics && <option value="">Loading topics…</option>}
              {topics?.length === 0 && <option value="">No topics for this specification</option>}
              {topics?.map((t) => (
                <option key={t.topicId} value={String(t.topicId)}>
                  {t.number ? `${t.number} ` : ""}
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={() => void generate()} loading={generating} disabled={!topicId || generating} icon={<Sparkle size={18} />}>
            {generating ? "Generating… (about 20 s)" : "Generate notes"}
          </Button>
        </FilterBar>
      )}

      {!forbidden && (
        <SectionTitle
          title="Versions"
          description="New versions start as pending QC. Approving one retires the previously approved version; students only see the approved one."
        />
      )}
      {!topicId && !forbidden ? (
        <DetailPlaceholder title="No topic chosen" body="Pick a specification and topic to see its revision notes." />
      ) : (
        <DataState
          state={notes}
          forbiddenBody={FORBIDDEN}
          errorTitle="Could not load revision notes"
          isEmpty={(d) => d.length === 0}
          emptyTitle="No notes for this topic yet"
          emptyBody="Use Generate notes to draft the first version."
        >
          {(items) => {
            const selected = items.find((n) => str(n.noteId) === selectedId) ?? null;
            return (
              <QueueLayout
                list={
                  <Table>
                    <thead>
                      <tr>
                        <Th>Version</Th>
                        <Th>Status</Th>
                        <Th>Reading level</Th>
                        <Th>Created</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((n) => {
                        const id = str(n.noteId);
                        return (
                          <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Version ${str(n.version)}`}>
                            <Td className="font-semibold tabular">v{str(n.version)}</Td>
                            <Td>
                              <StatusBadge status={n.status} />
                            </Td>
                            <Td>{readingLevel(n.readingLevel)}</Td>
                            <Td className="whitespace-nowrap tabular">{fmtDateTime(n.createdAt)}</Td>
                          </SelectableRow>
                        );
                      })}
                    </tbody>
                  </Table>
                }
                detail={
                  selected ? (
                    <NoteDetail
                      key={str(selected.noteId)}
                      row={selected}
                      onDone={async (n) => {
                        setNote(n);
                        await notes.reload();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select a version to preview it and approve or reject." />
                  )
                }
              />
            );
          }}
        </DataState>
      )}
    </AppPage>
  );
}

function NoteDetail({ row, onDone }: { row: Row; onDone: (n: Note) => Promise<void> }) {
  const id = str(row.noteId);
  const status = str(row.status, "");
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [local, setLocal] = useState<Note>(null);

  async function act(kind: "approve" | "reject") {
    setBusy(kind);
    setLocal(null);
    try {
      if (kind === "approve") {
        const r = await approveRevisionNote(id);
        const retired = Number(r.retiredCount ?? 0);
        await onDone({
          tone: "success",
          text: `Approved version ${str(row.version)}. Students now see it${retired > 0 ? "; the previous version was retired" : ""}.`,
        });
      } else {
        await rejectRevisionNote(id);
        await onDone({ tone: "success", text: `Rejected version ${str(row.version)}. It will not be shown to students.` });
      }
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, kind === "approve" ? "Approve failed" : "Reject failed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title={`Version ${str(row.version)}`} description={fmtDateTime(row.createdAt)} action={<StatusBadge status={row.status} />} />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Reading level", readingLevel(row.readingLevel)],
            ["Note ID", id],
          ]}
        />
        <div className="max-h-[60vh] overflow-y-auto rounded-md border border-neutral-200 p-4">
          {str(row.bodyMd, "") ? <Markdown source={str(row.bodyMd)} /> : <p className="text-neutral-600">This version has no body.</p>}
        </div>
        <ResultNote note={local} />
        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          <Button
            icon={<Check size={18} />}
            onClick={() => void act("approve")}
            loading={busy === "approve"}
            disabled={busy !== null || status === "APPROVED" || status === "RETIRED"}
          >
            Approve
          </Button>
          <Button
            variant="secondary"
            icon={<X size={18} />}
            onClick={() => void act("reject")}
            loading={busy === "reject"}
            disabled={busy !== null || status === "QC_FAILED"}
          >
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
