"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, SpeakerHigh, TextAa, Timer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, Callout, Field, Select } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";
import { FailureView, Switch } from "./StudentUI";
import { errorText, isRecord, toFailure, type LoadFailure } from "./studentData";

/** Same preference keys the original AccessibilityForm stored in accessibility_json. */
export type Prefs = {
  dyslexiaFont?: boolean;
  textScale?: number;
  highContrast?: boolean;
  reduceMotion?: boolean;
  tts?: boolean;
  extendedTimePct?: number;
  simplifiedLanguage?: boolean;
};

function parseJson(raw: unknown): Prefs {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Prefs;
  try {
    return JSON.parse(String(raw)) as Prefs;
  } catch {
    return {};
  }
}

const SCALE_STOPS: Array<{ value: number; label: string }> = [
  { value: 0.9, label: "Smaller" },
  { value: 1, label: "Default" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Larger" },
  { value: 1.5, label: "Largest" },
];

/**
 * J-03 / B-09 accessibility preferences (GET/PUT /students/{id}/accessibility). Changes preview immediately
 * through the same root CSS hooks as before (--a11y-text-scale, data-dyslexia, data-contrast, data-motion)
 * and persist on Save.
 */
export function AccessibilityPanel({ studentId, footer }: { studentId: string; footer?: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAccessibility(studentId)
      .then((r: unknown) => setPrefs(parseJson(isRecord(r) ? r.accessibilityJson : null)))
      .catch((e: unknown) => setFailure(toFailure(e, "Could not load your settings.")))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--a11y-text-scale", String(prefs.textScale ?? 1));
    document.documentElement.dataset.dyslexia = prefs.dyslexiaFont ? "1" : "0";
    document.documentElement.dataset.contrast = prefs.highContrast ? "high" : "default";
    document.documentElement.dataset.motion = prefs.reduceMotion ? "reduce" : "ok";
  }, [prefs]);

  function update(patch: Partial<Prefs>) {
    setSaved(false);
    setPrefs((p) => ({ ...p, ...patch }));
  }

  async function save() {
    setSaved(false);
    setSaveError(null);
    setSaving(true);
    try {
      const r: unknown = await api.putAccessibility(studentId, { accessibilityJson: prefs });
      setPrefs(parseJson(isRecord(r) ? r.accessibilityJson : null));
      setSaved(true);
    } catch (e) {
      setSaveError(errorText(e, "We couldn't save your settings. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading your settings…" lines={6} />;
  if (failure) return <FailureView failure={failure} forbiddenBody="Ask a parent to change these settings for you." />;

  const scale = prefs.textScale ?? 1;

  return (
    <div className="space-y-5 animate-rise">
      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><TextAa size={20} className="text-brand-navy" /> Reading</span>} description="Make text easier to read." />
        <CardBody className="divide-y divide-neutral-100 py-1">
          <Switch
            id="a11y-dyslexia"
            label="Dyslexia-friendly font"
            description="Wider letter spacing and clearer letter shapes."
            checked={!!prefs.dyslexiaFont}
            onChange={(v) => update({ dyslexiaFont: v })}
          />
          <div className="py-3.5">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="a11y-scale" className="text-[15px] font-semibold text-neutral-900">
                Text size
              </label>
              <span className="tabular text-[14px] font-semibold text-brand-navy">{Math.round(scale * 100)}%</span>
            </div>
            <input
              id="a11y-scale"
              type="range"
              min={0.9}
              max={1.5}
              step={0.05}
              value={scale}
              onChange={(e) => update({ textScale: Number(e.target.value) })}
              className="sl-range mt-3 w-full accent-[var(--tier-accent)]"
              aria-valuetext={`${Math.round(scale * 100)} percent`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Text size presets">
              {SCALE_STOPS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={Math.abs(scale - s.value) < 0.001}
                  onClick={() => update({ textScale: s.value })}
                  className={
                    "rounded-full border px-3 py-1 text-caption font-semibold transition-colors duration-fast " +
                    (Math.abs(scale - s.value) < 0.001
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Switch
            id="a11y-simplified"
            label="Simplified language"
            description="Questions use plainer wording. Your marks never change."
            checked={!!prefs.simplifiedLanguage}
            onChange={(v) => update({ simplifiedLanguage: v })}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><Eye size={20} className="text-brand-navy" /> Display and motion</span>} />
        <CardBody className="divide-y divide-neutral-100 py-1">
          <Switch
            id="a11y-contrast"
            label="High contrast"
            description="Stronger colours and borders."
            checked={!!prefs.highContrast}
            onChange={(v) => update({ highContrast: v })}
          />
          <Switch
            id="a11y-motion"
            label="Reduce motion"
            description="Turns off animations and card flips."
            checked={!!prefs.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><SpeakerHigh size={20} className="text-brand-navy" /> Listening</span>} />
        <CardBody className="py-1">
          <Switch
            id="a11y-tts"
            label="Read questions aloud"
            description="Text-to-speech for questions and feedback."
            checked={!!prefs.tts}
            onChange={(v) => update({ tts: v })}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><Timer size={20} className="text-brand-navy" /> Exams</span>} />
        <CardBody>
          <Field label="Extra time in mock exams" htmlFor="a11y-extra" hint="Applied when you set up a new mock paper.">
            <Select
              id="a11y-extra"
              value={prefs.extendedTimePct ?? 0}
              onChange={(e) => update({ extendedTimePct: Number(e.target.value) })}
            >
              <option value={0}>No extra time</option>
              <option value={25}>25% extra</option>
              <option value={50}>50% extra</option>
              <option value={100}>100% extra (double time)</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      {saveError && <Callout tone="danger" title="Not saved">{saveError}</Callout>}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={save} loading={saving}>
          Save settings
        </Button>
        <p role="status" aria-live="polite" className="text-[14px] font-medium text-answer-correct">
          {saved ? "Saved. Your settings are on." : ""}
        </p>
        {footer && <div className="ml-auto">{footer}</div>}
      </div>
    </div>
  );
}
