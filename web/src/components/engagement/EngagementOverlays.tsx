"use client";

import { useState } from "react";
import { engagementEvents, respondNudge } from "@/lib/api/w2";

/** G-02 confidence, G-03 nudge, G-04 frustration rescue overlays */
export function EngagementOverlays({ sessionId }: { sessionId?: string }) {
  const [nudge, setNudge] = useState<{ nudgeId: string; kind: string; copy: string } | null>(null);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function trigger(kind: "CONFIDENCE" | "HINT" | "RESCUE") {
    setBusy(true);
    try {
      const eventType =
        kind === "CONFIDENCE" ? "CONFIDENCE_PROMPT_SHOWN" : kind === "RESCUE" ? "CONFUSION_RESCUE_TRIGGERED" : "IDLE_DETECTED";
      const res = await engagementEvents([{ eventType, sessionId }]);
      const first = res.nudges?.[0];
      if (kind === "CONFIDENCE") setConfidenceOpen(true);
      if (first) setNudge(first);
    } catch {
      /* Shell-07 handled by parent */
    } finally {
      setBusy(false);
    }
  }

  async function onRespond(response: "ACCEPTED" | "DISMISSED") {
    if (!nudge) return;
    await respondNudge(nudge.nudgeId, response);
    setNudge(null);
    setConfidenceOpen(false);
  }

  return (
    <div className="mt-4 space-y-3" aria-live="polite">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border border-mist px-3 py-1 text-sm" disabled={busy} onClick={() => trigger("CONFIDENCE")}>
          Confidence check (G-02)
        </button>
        <button type="button" className="rounded border border-mist px-3 py-1 text-sm" disabled={busy} onClick={() => trigger("HINT")}>
          Hint nudge (G-03)
        </button>
        <button type="button" className="rounded border border-mist px-3 py-1 text-sm" disabled={busy} onClick={() => trigger("RESCUE")}>
          Frustration rescue (G-04)
        </button>
      </div>
      {(confidenceOpen || nudge) && (
        <div role="dialog" aria-label="Engagement prompt" className="rounded-md border border-accent/30 bg-white p-4">
          <p className="font-semibold">{nudge?.copy ?? "How sure are you about this answer?"}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded bg-accent px-3 py-1 text-sm text-white" onClick={() => onRespond("ACCEPTED")}>
              Accept
            </button>
            <button type="button" className="rounded border border-mist px-3 py-1 text-sm" onClick={() => onRespond("DISMISSED")}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
