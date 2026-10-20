"use client";

import { useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Checkbox, KeyValue, PageHeader } from "@/components/ui/primitives";
import { DataState, ResultNote, actionError, useApi, type Note } from "@/components/staff/ops";
import { str, type Row } from "@/components/staff/format";
import { useSchoolId, SCHOOL_ADMIN_FORBIDDEN } from "@/components/school/school";
import { kcsieConfirm, kcsiePack } from "@/lib/api/w2";


/** "DSL contacts" → "dslContacts" (answers key; "Filtering" → "filtering"). */
function answerKey(section: string): string {
  const words = section.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
}

/** KCS-01/02 — KCSIE pack review and confirmation (school admin). */
export default function KcsiePage() {
  const SCHOOL = useSchoolId();
  const state = useApi<Row>(async () => (await kcsiePack(SCHOOL)) as Row);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [confirmed, setConfirmed] = useState<{ status: string; id: string } | null>(null);

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Compliance"
        title="KCSIE confirmation"
        description="Review each section of the Keeping Children Safe in Education pack, then confirm your school's alignment."
      />
      <DataState state={state} forbiddenBody={SCHOOL_ADMIN_FORBIDDEN} errorTitle="Could not load the KCSIE pack">
        {(pack) => {
          const sections = Array.isArray(pack.sections) ? (pack.sections as unknown[]).map((s) => String(s)) : [];
          const allTicked = sections.length > 0 && sections.every((s) => ticked[s]);
          const doneCount = sections.filter((s) => ticked[s]).length;
          return (
            <Card>
              <CardHeader
                title="Safeguarding pack"
                description={`Version ${str(pack.packVersion)}`}
                action={
                  confirmed ? (
                    <Badge tone="success">Confirmed</Badge>
                  ) : (
                    <Badge tone="neutral">
                      <span className="tabular">
                        {doneCount}/{sections.length}
                      </span>{" "}
                      reviewed
                    </Badge>
                  )
                }
              />
              <CardBody className="space-y-5">
                {pack.note != null && <Callout tone="info">{str(pack.note)}</Callout>}
                {sections.length === 0 ? (
                  <p className="text-[14px] text-neutral-600">This pack has no sections to review.</p>
                ) : (
                  <fieldset>
                    <legend className="mb-3 text-[14px] font-semibold text-neutral-700">
                      Tick each section once your school has reviewed it
                    </legend>
                    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                      {sections.map((s) => (
                        <li key={s} className="px-4 py-3">
                          <Checkbox
                            label={s}
                            checked={!!ticked[s]}
                            disabled={!!confirmed}
                            onChange={(e) => setTicked((t) => ({ ...t, [s]: e.target.checked }))}
                          />
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                )}
                <ResultNote note={note} />
                {confirmed ? (
                  <KeyValue
                    items={[
                      ["Status", <Badge key="s" tone="success">{confirmed.status}</Badge>],
                      ["Confirmation ID", <span key="i" className="tabular">{confirmed.id}</span>],
                      ["Pack version", str(pack.packVersion)],
                    ]}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
                    <Button
                      icon={<ShieldCheck size={18} />}
                      disabled={!allTicked}
                      loading={saving}
                      onClick={async () => {
                        setSaving(true);
                        setNote(null);
                        try {
                          const answers: Record<string, boolean> = { filtering: true };
                          for (const s of sections) answers[answerKey(s)] = true;
                          const r = (await kcsieConfirm(SCHOOL, { packVersion: pack.packVersion, answers })) as Row | null;
                          setConfirmed({ status: str(r?.status, "CONFIRMED"), id: str(r?.confirmationId) });
                          setNote({ tone: "success", text: "Alignment confirmed and recorded for your school." });
                        } catch (err) {
                          setNote({ tone: "danger", text: actionError(err, "Could not record the confirmation. Try again.") });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Confirm alignment
                    </Button>
                    {!allTicked && <p className="text-caption text-neutral-600">Tick every section to confirm.</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        }}
      </DataState>
    </AppPage>
  );
}
