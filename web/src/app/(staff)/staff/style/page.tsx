"use client";

import { useState, type FormEvent } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardBody, CardHeader, Checkbox, Field, PageHeader, Table, Td, Textarea, Th } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { DataState, DetailPlaceholder, QueueLayout, ResultNote, SelectableRow, actionError, useApi, type Note } from "@/components/staff/ops";
import { fmtDate, str, type Row } from "@/components/staff/format";
import { listStyleProfiles, putStyleProfile } from "@/lib/api/staff";
import { getStyleProfile } from "@/lib/api/staff-ops";

/** M-02 — Exam board style profiles (content admin). Used to keep generated questions in board voice. */
export default function StylePage() {
  const state = useApi<Row[]>(async () => (await listStyleProfiles()).items);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  return (
    <AppPage>
      <PageHeader
        eyebrow="Content"
        title="Board style profiles"
        description="How each board words questions and formats mark schemes. Generation and QC read these notes."
      />
      <ResultNote note={note} onDismiss={() => setNote(null)} className="mb-4" />
      <DataState
        state={state}
        forbiddenBody="Style profiles are managed by content admins."
        errorTitle="Could not load style profiles"
        isEmpty={(d) => d.length === 0}
        emptyTitle="No profiles"
        emptyBody="Derive or create a profile for a specification."
      >
        {(items) => {
          const selected = items.find((p) => str(p.specificationId) === selectedId) ?? null;
          return (
            <QueueLayout
              className="lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]"
              list={
                <Table>
                  <thead>
                    <tr>
                      <Th>Specification</Th>
                      <Th>State symbols</Th>
                      <Th>Updated</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const id = str(p.specificationId);
                      return (
                        <SelectableRow key={id} selected={id === selectedId} onSelect={() => setSelectedId(id)} label={`Profile ${str(p.specCode)}`}>
                          <Td>
                            <span className="block font-semibold">{str(p.specCode)}</span>
                            <span className="text-caption text-neutral-600">{str(p.title)}</span>
                          </Td>
                          <Td>{p.stateSymbolsRequired ? <Badge tone="info">Required</Badge> : <Badge>Not required</Badge>}</Td>
                          <Td className="whitespace-nowrap tabular text-neutral-700">{fmtDate(p.updatedAt)}</Td>
                        </SelectableRow>
                      );
                    })}
                  </tbody>
                </Table>
              }
              detail={
                selected ? (
                  <ProfileEditor
                    key={`${str(selected.specificationId)}-${str(selected.updatedAt, "")}`}
                    profile={selected}
                    onSaved={async (n) => {
                      setNote(n);
                      await state.reload();
                    }}
                  />
                ) : (
                  <DetailPlaceholder body="Select a specification to edit its style notes." />
                )
              }
            />
          );
        }}
      </DataState>
    </AppPage>
  );
}

function ProfileEditor({ profile, onSaved }: { profile: Row; onSaved: (n: Note) => Promise<void> }) {
  const id = str(profile.specificationId);
  // The list omits typical paper structure notes, so load the full profile before editing.
  const full = useApi<Row>(() => getStyleProfile(id), { key: id });
  if (full.problem && !full.data) {
    return <ResultNote note={{ tone: "danger", text: full.problem.message }} />;
  }
  if (!full.data) return <LoadingState lines={6} />;
  return <ProfileForm key={str(full.data.updatedAt, id)} profile={{ ...profile, ...full.data }} onSaved={onSaved} />;
}

function ProfileForm({ profile, onSaved }: { profile: Row; onSaved: (n: Note) => Promise<void> }) {
  const id = str(profile.specificationId);
  const initial = {
    wording: str(profile.questionWordingNotes, ""),
    scheme: str(profile.markSchemeFormatNotes, ""),
    structure: str(profile.typicalPaperStructureNotes, ""),
    stateSymbols: profile.stateSymbolsRequired === true,
  };
  const [wording, setWording] = useState(initial.wording);
  const [scheme, setScheme] = useState(initial.scheme);
  const [structure, setStructure] = useState(initial.structure);
  const [stateSymbols, setStateSymbols] = useState(initial.stateSymbols);
  const [saving, setSaving] = useState(false);
  const [wordingError, setWordingError] = useState<string | null>(null);
  const [local, setLocal] = useState<Note>(null);

  const dirty =
    wording !== initial.wording ||
    scheme !== initial.scheme ||
    structure !== initial.structure ||
    stateSymbols !== initial.stateSymbols;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!wording.trim()) {
      setWordingError("Question wording notes cannot be empty.");
      return;
    }
    setWordingError(null);
    // Send only changed fields; the API keeps any field that is left out.
    const body: Record<string, unknown> = {};
    if (wording !== initial.wording) body.questionWordingNotes = wording.trim();
    if (scheme !== initial.scheme) body.markSchemeFormatNotes = scheme.trim();
    if (structure !== initial.structure) body.typicalPaperStructureNotes = structure.trim();
    if (stateSymbols !== initial.stateSymbols) body.stateSymbolsRequired = stateSymbols;
    setSaving(true);
    setLocal(null);
    try {
      await putStyleProfile(id, body);
      await onSaved({ tone: "success", text: `Updated ${str(profile.specCode)}` });
    } catch (err) {
      setLocal({ tone: "danger", text: actionError(err, "Update failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={str(profile.specCode)} description={str(profile.title)} action={dirty ? <Badge tone="warning">Unsaved</Badge> : undefined} />
      <form onSubmit={save} noValidate>
        <CardBody className="space-y-4">
          <Field label="Question wording" htmlFor="sp-wording" hint="Command words, phrasing and tone the board uses." error={wordingError}>
            <Textarea id="sp-wording" value={wording} onChange={(e) => setWording(e.target.value)} />
          </Field>
          <Field label="Mark scheme format" htmlFor="sp-scheme" hint="How marking points, alternatives and ignores are written.">
            <Textarea id="sp-scheme" value={scheme} onChange={(e) => setScheme(e.target.value)} />
          </Field>
          <Field label="Typical paper structure" htmlFor="sp-structure">
            <Textarea id="sp-structure" value={structure} onChange={(e) => setStructure(e.target.value)} className="min-h-[88px]" />
          </Field>
          <Checkbox
            label="State symbols required in chemical equations"
            checked={stateSymbols}
            onChange={(e) => setStateSymbols(e.target.checked)}
          />
          <ResultNote note={local} />
          <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
            <Button type="submit" loading={saving} disabled={!dirty} icon={<FloppyDisk size={18} />}>
              Save profile
            </Button>
            <Button
              type="button"
              variant="tertiary"
              disabled={!dirty || saving}
              onClick={() => {
                setWording(initial.wording);
                setScheme(initial.scheme);
                setStructure(initial.structure);
                setStateSymbols(initial.stateSymbols);
              }}
            >
              Discard changes
            </Button>
          </div>
        </CardBody>
      </form>
    </Card>
  );
}
