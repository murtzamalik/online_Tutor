"use client";

import { specTopics, type SpecTopic } from "@/lib/api/catalog";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, FilePlus, Play, PlusCircle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import {
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
import {
  DataState,
  DetailPlaceholder,
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
import { humanise, int, str, type Row } from "@/components/staff/format";
import { createQuestion, ingestPastPaper, listPastPapers, patchLicence, registerPastPaper } from "@/lib/api/staff";
import { listSpecifications } from "@/lib/api/catalog";

type Spec = { specificationId: string; specCode: string; title: string };

const QUESTION_TYPES = ["SHORT_ANSWER", "MULTIPLE_CHOICE", "CALCULATION", "EXTENDED_WRITTEN", "PRACTICAL_BASED"] as const;
const LICENCES = ["OFFICIAL_TEACHING_USE", "BOARD_LICENSED", "PENDING_BOARD_CONFIRMATION", "RESTRICTED", "UNKNOWN"] as const;
const FORBIDDEN = "Authoring and past-paper import are for content admins.";

/** E-02 — Question authoring and past-paper import (content admin). No PMT sources. */
export default function AuthoringPage() {
  const papers = useApi<Row[]>(async () => (await listPastPapers()).items);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [specId, setSpecId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    listSpecifications()
      .then((r) => {
        setSpecs(r.items.map((s) => ({ specificationId: String(s.specificationId), specCode: s.specCode, title: s.title ?? "" })));
        const aqa = r.items.find((s) => s.specCode === "8462") ?? r.items[0];
        if (aqa) setSpecId(String(aqa.specificationId));
      })
      .catch(() => undefined);
  }, []);

  const forbidden = !!papers.problem?.forbidden;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Authoring and past papers"
        description="Author a question for QC, or register an official past paper and run ingestion. Papers must come from the exam board's own site."
        actions={
          <Button variant="secondary" onClick={() => void papers.reload()} loading={papers.loading && !!papers.data} icon={<ArrowClockwise size={18} />}>
            Refresh
          </Button>
        }
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />

      {!forbidden && (
        <div className="grid gap-6 lg:grid-cols-2">
          <QuestionForm specs={specs} specId={specId} setSpecId={setSpecId} onNote={setNote} />
          <PaperForm
            specs={specs}
            specId={specId}
            setSpecId={setSpecId}
            onNote={setNote}
            onCreated={async (id) => {
              await papers.reload();
              if (id) setSelectedId(id);
            }}
          />
        </div>
      )}

      {!forbidden && <SectionTitle title="Past papers" description="Set the licence once the board confirms use, then run ingestion." />}
      <DataState
        state={papers}
        forbiddenBody={FORBIDDEN}
        errorTitle="Could not load past papers"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No past papers yet"
        emptyBody="Register a paper above to start an import."
      >
        {(items) => {
          const selected = items.find((p) => str(p.paperId) === selectedId) ?? null;
          const ready = items.filter((p) => str(p.ingestStatus, "") === "READY").length;
          const pendingLicence = items.filter((p) => ["UNKNOWN", "PENDING_BOARD_CONFIRMATION"].includes(str(p.licenceStatus, ""))).length;
          return (
            <>
              <StatRow cols={3}>
                <StatTile label="Papers" value={int(items.length)} />
                <StatTile label="Awaiting licence" value={int(pendingLicence)} />
                <StatTile label="Ingested" value={int(ready)} />
              </StatRow>
              <QueueLayout
                list={
                  <Table>
                    <thead>
                      <tr>
                        <Th>Paper</Th>
                        <Th>Series</Th>
                        <Th>Licence</Th>
                        <Th>Ingest</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => {
                        const id = str(p.paperId);
                        return (
                          <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Paper ${str(p.paperCode)}`}>
                            <Td>
                              <span className="block font-semibold">{str(p.paperCode)}</span>
                              <span className="text-caption text-neutral-600">{str(p.title)}</span>
                            </Td>
                            <Td className="whitespace-nowrap tabular">
                              {str(p.series)} · {str(p.examYear)}
                            </Td>
                            <Td>
                              <StatusBadge status={p.licenceStatus} />
                            </Td>
                            <Td>
                              <StatusBadge status={p.ingestStatus} />
                            </Td>
                          </SelectableRow>
                        );
                      })}
                    </tbody>
                  </Table>
                }
                detail={
                  selected ? (
                    <PaperDetail
                      key={str(selected.paperId)}
                      paper={selected}
                      onDone={async (n) => {
                        setNote(n);
                        await papers.reload();
                      }}
                    />
                  ) : (
                    <DetailPlaceholder body="Select a paper to set its licence or run ingestion." />
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

function SpecSelect({ id, specs, value, onChange }: { id: string; specs: Spec[]; value: string; onChange: (v: string) => void }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={specs.length === 0}>
      {specs.length === 0 && <option value="">Loading specifications…</option>}
      {specs.map((s) => (
        <option key={s.specificationId} value={s.specificationId}>
          {s.specCode}
          {s.title ? ` — ${s.title}` : ""}
        </option>
      ))}
    </Select>
  );
}

function QuestionForm({
  specs,
  specId,
  setSpecId,
  onNote,
}: {
  specs: Spec[];
  specId: string;
  setSpecId: (v: string) => void;
  onNote: (n: Note) => void;
}) {
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<SpecTopic[] | null>(null);

  // Topics of the chosen specification, so authors pick a name instead of typing an id.
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
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<string>("SHORT_ANSWER");
  const [marks, setMarks] = useState("1");
  const [errors, setErrors] = useState<Partial<Record<"spec" | "topic" | "text" | "marks", string>>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!specId) next.spec = "Choose a specification.";
    const t = Number(topicId);
    if (!Number.isInteger(t) || t <= 0) next.topic = "Choose a topic.";
    if (!qText.trim()) next.text = "Write the question stem.";
    const m = Number(marks);
    if (!Number.isInteger(m) || m < 1 || m > 30) next.marks = "Marks must be a whole number from 1 to 30.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const q = await createQuestion({
        specificationId: Number(specId),
        topicId: t,
        questionText: qText.trim(),
        questionType: qType,
        marksAvailable: m,
      });
      onNote({ tone: "success", text: `Created question ${String(q.questionId)}. It is now in the QC queue.` });
      setQText("");
    } catch (err) {
      onNote({ tone: "danger", text: actionError(err, "Create failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Author a question" description="Saved as pending QC with an empty points mark scheme." />
      <form onSubmit={submit} noValidate>
        <CardBody className="space-y-4">
          <Field label="Specification" htmlFor="q-spec" error={errors.spec}>
            <SpecSelect id="q-spec" specs={specs} value={specId} onChange={setSpecId} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Topic" htmlFor="topic" error={errors.topic} className="sm:col-span-2">
              <Select id="topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!topics || topics.length === 0}>
                {!topics && <option value="">Loading topics…</option>}
                {topics?.length === 0 && <option value="">No topics for this specification</option>}
                {topics?.map((t) => (
                  <option key={t.topicId} value={String(t.topicId)}>
                    {t.number ? `${t.number} ` : ""}{t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" htmlFor="q-type">
              <Select id="q-type" value={qType} onChange={(e) => setQType(e.target.value)}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanise(t)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Question text" htmlFor="qtext" error={errors.text}>
            <Textarea id="qtext" rows={3} value={qText} onChange={(e) => setQText(e.target.value)} />
          </Field>
          <Field label="Marks" htmlFor="q-marks" error={errors.marks} className="sm:w-32">
            <Input id="q-marks" type="number" min={1} max={30} value={marks} onChange={(e) => setMarks(e.target.value)} className="tabular" />
          </Field>
          <Button type="submit" loading={saving} icon={<PlusCircle size={18} />}>
            Create question
          </Button>
        </CardBody>
      </form>
    </Card>
  );
}

function PaperForm({
  specs,
  specId,
  setSpecId,
  onNote,
  onCreated,
}: {
  specs: Spec[];
  specId: string;
  setSpecId: (v: string) => void;
  onNote: (n: Note) => void;
  onCreated: (paperId: string | null) => Promise<void>;
}) {
  const [series, setSeries] = useState("");
  const [year, setYear] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"spec" | "series" | "year" | "code" | "url", string>>>({});
  const [saving, setSaving] = useState(false);

  // Generated after mount so server and client render the same markup.
  useEffect(() => {
    setCode(`W1-DEMO-${Date.now().toString().slice(-4)}`);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!specId) next.spec = "Choose a specification.";
    if (!series.trim()) next.series = "Enter the exam series, e.g. JUN2023.";
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) next.year = "Enter a four-digit year.";
    if (!code.trim()) next.code = "Enter the board's paper code.";
    const u = url.trim().toLowerCase();
    if (!/^https:\/\/[^\s]+$/.test(u)) next.url = "Enter the full https:// link on the exam board's site.";
    else if (u.includes("physicsandmathstutor") || u.includes("/pmt/")) next.url = "PMT sources are not permitted. Use the exam board's site.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const paper = await registerPastPaper({
        specificationId: Number(specId),
        series: series.trim(),
        examYear: y,
        paperCode: code.trim(),
        title: title.trim() || code.trim(),
        sourceUrl: url.trim(),
      });
      onNote({ tone: "success", text: `Registered paper ${String(paper.paperId)}. Set its licence before ingesting.` });
      setCode(`W1-DEMO-${Date.now().toString().slice(-4)}`);
      await onCreated(paper.paperId != null ? String(paper.paperId) : null);
    } catch (err) {
      onNote({ tone: "danger", text: actionError(err, "Register failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Register a past paper" description="Starts as pending board confirmation." />
      <form onSubmit={submit} noValidate>
        <CardBody className="space-y-4">
          <Field label="Specification" htmlFor="p-spec" error={errors.spec}>
            <SpecSelect id="p-spec" specs={specs} value={specId} onChange={setSpecId} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Series" htmlFor="p-series" error={errors.series}>
              <Input id="p-series" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="JUN2023" />
            </Field>
            <Field label="Year" htmlFor="p-year" error={errors.year}>
              <Input id="p-year" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" className="tabular" placeholder="2023" />
            </Field>
            <Field label="Paper code" htmlFor="p-code" error={errors.code}>
              <Input id="p-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="8462/1H" />
            </Field>
          </div>
          <Field label="Title" htmlFor="p-title" hint="Optional. Defaults to the paper code.">
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paper 1 Higher, June 2023" />
          </Field>
          <Field label="Source URL" htmlFor="p-url" error={errors.url} hint="Official exam board page only.">
            <Input id="p-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.aqa.org.uk/…" />
          </Field>
          <Button type="submit" variant="secondary" loading={saving} icon={<FilePlus size={18} />}>
            Register paper
          </Button>
        </CardBody>
      </form>
    </Card>
  );
}

function PaperDetail({ paper, onDone }: { paper: Row; onDone: (n: Note) => Promise<void> }) {
  const id = str(paper.paperId);
  const [licence, setLicence] = useState<string>(
    LICENCES.includes(str(paper.licenceStatus, "") as (typeof LICENCES)[number]) && str(paper.licenceStatus, "") !== "UNKNOWN"
      ? str(paper.licenceStatus)
      : "OFFICIAL_TEACHING_USE",
  );
  const [busy, setBusy] = useState<null | "licence" | "ingest">(null);
  const [local, setLocal] = useState<Note>(null);
  const licensed = ["OFFICIAL_TEACHING_USE", "BOARD_LICENSED"].includes(str(paper.licenceStatus, ""));

  async function saveLicence() {
    setBusy("licence");
    setLocal(null);
    try {
      await patchLicence(id, licence);
      await onDone({ tone: "success", text: `Licence for ${str(paper.paperCode)} set to ${humanise(licence).toLowerCase()}.` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Licence failed") });
    } finally {
      setBusy(null);
    }
  }

  async function ingest() {
    setBusy("ingest");
    setLocal(null);
    try {
      const job = await ingestPastPaper(id);
      const count = job.itemCount != null ? ` ${str(job.itemCount)} items extracted.` : "";
      await onDone({ tone: "success", text: `Ingest ${humanise(job.status).toLowerCase()} — job ${str(job.jobId).slice(0, 8)}.${count}` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Ingest failed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader title={str(paper.paperCode)} description={str(paper.title)} action={<StatusBadge status={paper.ingestStatus} />} />
      <CardBody className="space-y-4">
        <KeyValue
          items={[
            ["Series", `${str(paper.series)} · ${str(paper.examYear)}`],
            ["Specification", str(paper.specificationId)],
            ["Tier", humanise(paper.tier)],
            ["Licence", <StatusBadge key="l" status={paper.licenceStatus} />],
            [
              "Source",
              str(paper.sourceUrl, "") ? (
                <a key="s" href={str(paper.sourceUrl)} target="_blank" rel="noreferrer noopener" className="break-all text-brand-navy underline">
                  Board page
                </a>
              ) : (
                "—"
              ),
            ],
          ]}
        />
        <ResultNote note={local} />
        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <div className="flex items-end gap-2">
            <Field label="Licence status" htmlFor="lic" className="min-w-0 flex-1">
              <Select id="lic" value={licence} onChange={(e) => setLicence(e.target.value)}>
                {LICENCES.map((l) => (
                  <option key={l} value={l}>
                    {humanise(l)}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" onClick={() => void saveLicence()} loading={busy === "licence"} disabled={busy !== null}>
              Set licence
            </Button>
          </div>
          {!licensed && (
            <Callout tone="warning">Ingestion needs a confirmed licence (official teaching use or board licensed).</Callout>
          )}
          <Button className="w-full" icon={<Play size={18} />} onClick={() => void ingest()} loading={busy === "ingest"} disabled={busy !== null}>
            Run ingestion
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
