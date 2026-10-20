"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAiControls, getTranscripts, putAiControls } from "@/lib/api/w2";
import * as w4 from "@/lib/api/w4";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, CardHeader, Checkbox, Field, Input, Table, Td, Th } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { ChildHeader } from "@/components/parent/ChildHeader";
import { getDailyGoalSummary } from "@/components/parent/api";
import { LoadView, useLoad } from "@/components/parent/useLoad";
import { asRecord, errorMessage, formatDateTime, humanise, str } from "@/components/parent/format";

type Controls = { chatEnabled: boolean; voiceEnabled: boolean; dailyGoalNudge: boolean; raw: Record<string, unknown> };
type Transcript = { tutorSessionId: string; channel?: string; mode?: string; status?: string; startedAt?: unknown; endedAt?: unknown };
type ToggleKey = "chatEnabled" | "voiceEnabled" | "dailyGoalNudge";

function toControls(v: unknown): Controls {
  const r = asRecord(v);
  return { chatEnabled: !!r.chatEnabled, voiceEnabled: !!r.voiceEnabled, dailyGoalNudge: !!r.dailyGoalNudge, raw: r };
}

function duration(start: unknown, end: unknown): string {
  if (typeof start !== "string" || typeof end !== "string") return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  return mins < 1 ? "< 1 min" : `${mins} min`;
}

/** H-09 + K-02 daily goal nudge opt-in (nudges only; not default-on; no K-01 streaks) */
export default function ControlsPage() {
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState(10);
  const [saving, setSaving] = useState<ToggleKey | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalNote, setGoalNote] = useState<{ ok: boolean; text: string } | null>(null);

  const { state, retry, setData } = useLoad(
    async () => {
      const [c, t] = await Promise.all([getAiControls(id), getTranscripts(id)]);
      const transcripts: Transcript[] = t.items.map((v) => {
        const r = asRecord(v);
        return {
          tutorSessionId: str(r.tutorSessionId) ?? "",
          channel: str(r.channel),
          mode: str(r.mode),
          status: str(r.status),
          startedAt: r.startedAt,
          endedAt: r.endedAt,
        };
      });
      return { controls: toControls(c), transcripts };
    },
    [id],
    "Could not load controls",
  );

  useEffect(() => {
    getDailyGoalSummary(id)
      .then((g) => {
        if (g.target != null && g.target > 0) setGoal(g.target);
      })
      .catch(() => undefined);
  }, [id]);

  async function toggle(key: ToggleKey, value: boolean) {
    if (state.status !== "ready") return;
    setSaving(key);
    setToggleError(null);
    try {
      const next = await putAiControls(id, { [key]: value });
      setData({ ...state.data, controls: toControls(next) });
    } catch (err) {
      if (err instanceof ApiError && (err.code === "VOICE_CONSENT_REQUIRED" || /voice consent/i.test(err.message))) {
        setToggleError("VOICE_CONSENT");
      } else {
        setToggleError(errorMessage(err, "Could not save that setting. Try again."));
      }
    } finally {
      setSaving(null);
    }
  }

  async function saveGoal() {
    if (!Number.isInteger(goal) || goal < 1 || goal > 50) {
      setGoalNote({ ok: false, text: "Choose a whole number between 1 and 50." });
      return;
    }
    setGoalBusy(true);
    setGoalNote(null);
    try {
      await w4.putDailyGoal(id, { targetQuestions: goal });
      setGoalNote({ ok: true, text: `Daily target set to ${goal} questions.` });
    } catch (e) {
      setGoalNote({ ok: false, text: errorMessage(e, "Could not update the goal target.") });
    } finally {
      setGoalBusy(false);
    }
  }

  return (
    <AppPage>
      <ChildHeader
        studentId={id}
        active="controls"
        title="AI controls & transcripts"
        description="Choose which AI tutor features your child can use, and review their recent tutor sessions."
      />
      <LoadView state={state} onRetry={retry}>
        {({ controls, transcripts }) => (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="AI tutor" description="Changes save straight away." />
                <CardBody className="space-y-4" aria-live="polite">
                  <ToggleRow
                    label="Chat tutor"
                    hint="Typed help that guides your child through a problem without giving the answer away."
                    checked={controls.chatEnabled}
                    saving={saving === "chatEnabled"}
                    onChange={(v) => toggle("chatEnabled", v)}
                  />
                  <ToggleRow
                    label="Voice tutor"
                    hint="Spoken help. Needs separate voice consent; transcripts are kept for 30 days."
                    checked={controls.voiceEnabled}
                    saving={saving === "voiceEnabled"}
                    onChange={(v) => toggle("voiceEnabled", v)}
                  />
                  {toggleError === "VOICE_CONSENT" ? (
                    <Callout tone="warning" title="Voice consent needed">
                      Give voice consent first, then turn the voice tutor on.{" "}
                      <Link href="/voice/consent" className="font-semibold underline">
                        Give voice consent
                      </Link>
                    </Callout>
                  ) : (
                    toggleError && <Callout tone="danger">{toggleError}</Callout>
                  )}
                </CardBody>
              </Card>

              <section id="goals" className="scroll-mt-24" aria-labelledby="goals-heading">
                <Card>
                  <div className="border-b border-neutral-200 px-5 py-4">
                    <h2 id="goals-heading" className="text-[16px] font-semibold text-neutral-900">
                      Daily goal nudges
                    </h2>
                    <p className="mt-0.5 text-caption text-neutral-600">
                      Optional reminders only. Off by default — no badges, streaks or pressure.
                    </p>
                  </div>
                  <CardBody className="space-y-4">
                    <ToggleRow
                      label="Allow daily goal nudges"
                      checked={controls.dailyGoalNudge}
                      saving={saving === "dailyGoalNudge"}
                      onChange={(v) => toggle("dailyGoalNudge", v)}
                    />
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="Daily question target" htmlFor="goal-target" hint="Between 1 and 50." className="w-40">
                        <Input
                          id="goal-target"
                          type="number"
                          min={1}
                          max={50}
                          inputMode="numeric"
                          className="tabular"
                          value={Number.isNaN(goal) ? "" : goal}
                          onChange={(e) => setGoal(Number(e.target.value))}
                        />
                      </Field>
                      <Button variant="secondary" loading={goalBusy} onClick={saveGoal} className="mb-6">
                        Update goal target
                      </Button>
                    </div>
                    {goalNote && (
                      <div aria-live="polite">
                        <Callout tone={goalNote.ok ? "success" : "danger"}>{goalNote.text}</Callout>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </section>
            </div>

            <section aria-labelledby="sessions-heading">
              <h2 id="sessions-heading" className="mb-3 text-h2 text-neutral-900">
                Recent tutor sessions
              </h2>
              {transcripts.length === 0 ? (
                <EmptyState title="No tutor sessions yet" body="Sessions appear here after your child uses the chat or voice tutor." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Started</Th>
                      <Th>Channel</Th>
                      <Th className="hidden sm:table-cell">Mode</Th>
                      <Th className="hidden sm:table-cell">Length</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {transcripts.map((t) => (
                      <tr key={t.tutorSessionId}>
                        <Td className="tabular whitespace-nowrap">{formatDateTime(t.startedAt)}</Td>
                        <Td>
                          <Badge tone={t.channel === "VOICE" ? "teal" : "brand"}>{humanise(t.channel)}</Badge>
                        </Td>
                        <Td className="hidden text-neutral-700 sm:table-cell">{humanise(t.mode)}</Td>
                        <Td className="tabular hidden text-neutral-700 sm:table-cell">{duration(t.startedAt, t.endedAt)}</Td>
                        <Td className="text-neutral-700">{humanise(t.status)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </section>
          </div>
        )}
      </LoadView>
    </AppPage>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  saving,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  saving: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Checkbox label={<span className="font-semibold text-neutral-900">{label}</span>} checked={checked} disabled={saving} onChange={(e) => onChange(e.target.checked)} />
        {hint && <p className="ml-[26px] mt-0.5 text-caption text-neutral-600">{hint}</p>}
      </div>
      <span className="shrink-0 text-caption text-neutral-600" aria-live="polite">
        {saving ? "Saving…" : checked ? "On" : "Off"}
      </span>
    </div>
  );
}
