"use client";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/states";
import * as api from "@/lib/api/w4";

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
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

export function AccessibilityForm({ title, studentId }: { title: string; studentId: string }) {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAccessibility(studentId)
      .then((r) => setPrefs(parseJson(r.accessibilityJson)))
      .catch((e) => setError(e?.message ?? "Could not load"))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--a11y-text-scale", String(prefs.textScale ?? 1));
    document.documentElement.dataset.dyslexia = prefs.dyslexiaFont ? "1" : "0";
    document.documentElement.dataset.contrast = prefs.highContrast ? "high" : "default";
    document.documentElement.dataset.motion = prefs.reduceMotion ? "reduce" : "ok";
  }, [prefs]);

  async function save() {
    setSaved(false);
    try {
      const r = await api.putAccessibility(studentId, { accessibilityJson: prefs });
      setPrefs(parseJson(r.accessibilityJson));
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState body={error} />;

  return (
    <div className="space-y-4 animate-rise">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-ink/70">Changes apply as CSS tokens immediately and persist to your profile.</p>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.dyslexiaFont} onChange={(e) => setPrefs({ ...prefs, dyslexiaFont: e.target.checked })} /> Dyslexia-friendly font</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.highContrast} onChange={(e) => setPrefs({ ...prefs, highContrast: e.target.checked })} /> High contrast</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.reduceMotion} onChange={(e) => setPrefs({ ...prefs, reduceMotion: e.target.checked })} /> Reduce motion</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.tts} onChange={(e) => setPrefs({ ...prefs, tts: e.target.checked })} /> Text-to-speech</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!prefs.simplifiedLanguage} onChange={(e) => setPrefs({ ...prefs, simplifiedLanguage: e.target.checked })} /> Simplified language (J-05 — never changes marks)</label>
      <label className="block text-sm">
        Text scale
        <input className="ml-2 w-24" type="number" min={0.9} max={1.5} step={0.05} value={prefs.textScale ?? 1} onChange={(e) => setPrefs({ ...prefs, textScale: Number(e.target.value) })} aria-label="Text scale" />
      </label>
      <label className="block text-sm">
        Extended time %
        <select className="ml-2 rounded border px-2 py-1" value={prefs.extendedTimePct ?? 0} onChange={(e) => setPrefs({ ...prefs, extendedTimePct: Number(e.target.value) })} aria-label="Extended time percent">
          <option value={0}>0%</option>
          <option value={25}>25%</option>
          <option value={50}>50%</option>
          <option value={100}>100%</option>
        </select>
      </label>
      <button type="button" className="rounded border px-4 py-2" onClick={save}>Save preferences</button>
      {saved && <p role="status" aria-live="polite" className="text-sm">Saved.</p>}
    </div>
  );
}
