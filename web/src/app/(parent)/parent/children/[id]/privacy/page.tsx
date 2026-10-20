"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DownloadSimple, Trash } from "@phosphor-icons/react";
import { getPrivacy, putPrivacy } from "@/lib/api/w2";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Checkbox, Field, Select } from "@/components/ui/primitives";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage } from "@/components/parent/format";

type Privacy = { telemetryLevel: string; teacherVisibility: boolean; cohortBenchmarkOptIn: boolean };

function toPrivacy(v: unknown): Privacy {
  const r = asRecord(v);
  return {
    telemetryLevel: typeof r.telemetryLevel === "string" ? r.telemetryLevel : "ESSENTIAL",
    teacherVisibility: !!r.teacherVisibility,
    cohortBenchmarkOptIn: !!r.cohortBenchmarkOptIn,
  };
}

/** L-03 high-privacy defaults */
export default function PrivacyPage() {
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState<keyof Privacy | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const { state, retry, setData } = useLoad(async () => toPrivacy(await getPrivacy(id)), [id], "Could not load privacy settings");

  async function save(key: keyof Privacy, value: string | boolean) {
    setSaving(key);
    setNote(null);
    try {
      const next = toPrivacy(await putPrivacy(id, { [key]: value }));
      setData(next);
      setNote({ ok: true, text: "Saved." });
    } catch (e) {
      setNote({ ok: false, text: errorMessage(e, "Could not save that setting. Try again.") });
    } finally {
      setSaving(null);
    }
  }

  return (
    <AppPage>
      <ChildHeader
        studentId={id}
        active="privacy"
        title="Privacy settings"
        description="High-privacy defaults: telemetry starts at Essential and nothing is shared unless you turn it on."
      />
      <LoadView state={state} onRetry={retry}>
        {(p) => (
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Data sharing" description="Changes save straight away." />
              <CardBody className="space-y-5">
                <Field
                  label="Telemetry"
                  htmlFor="telemetry"
                  hint={
                    p.telemetryLevel === "ESSENTIAL"
                      ? "Essential: only what's needed to run the service and keep it secure."
                      : "Engagement: also collects how features are used, to help us improve them."
                  }
                >
                  <Select
                    id="telemetry"
                    value={p.telemetryLevel}
                    disabled={saving === "telemetryLevel"}
                    onChange={(e) => save("telemetryLevel", e.target.value)}
                  >
                    <option value="ESSENTIAL">Essential</option>
                    <option value="ENGAGEMENT">Engagement</option>
                  </Select>
                </Field>
                <div>
                  <Checkbox
                    label={<span className="font-semibold text-neutral-900">Teacher visibility</span>}
                    checked={p.teacherVisibility}
                    disabled={saving === "teacherVisibility"}
                    onChange={(e) => save("teacherVisibility", e.target.checked)}
                  />
                  <p className="ml-[26px] mt-0.5 text-caption text-neutral-600">
                    Lets your child&apos;s school teacher see their progress if the school uses Study Loop.
                  </p>
                </div>
                <div>
                  <Checkbox
                    label={<span className="font-semibold text-neutral-900">Include in anonymous cohort benchmarks</span>}
                    checked={p.cohortBenchmarkOptIn}
                    disabled={saving === "cohortBenchmarkOptIn"}
                    onChange={(e) => save("cohortBenchmarkOptIn", e.target.checked)}
                  />
                  <p className="ml-[26px] mt-0.5 text-caption text-neutral-600">
                    Compares progress with similar learners. Only shown when the group is large enough to stay anonymous.
                  </p>
                </div>
                <div aria-live="polite">{note && <Callout tone={note.ok ? "success" : "danger"}>{note.text}</Callout>}</div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Your child's data" />
              <CardBody className="space-y-3">
                <p className="text-[14px] text-neutral-700">
                  Download a copy of everything we hold, or ask us to delete it. Deletion has a cooling-off period and can be
                  cancelled.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink
                    href={`/parent/children/${id}/privacy/delete`}
                    variant="secondary"
                    size="sm"
                    icon={<DownloadSimple size={16} aria-hidden />}
                  >
                    Export data
                  </ButtonLink>
                  <ButtonLink
                    href={`/parent/children/${id}/privacy/delete`}
                    variant="tertiary"
                    size="sm"
                    icon={<Trash size={16} aria-hidden />}
                  >
                    Delete data
                  </ButtonLink>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </LoadView>
    </AppPage>
  );
}
