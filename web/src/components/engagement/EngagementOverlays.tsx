"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, X } from "@phosphor-icons/react";
import { engagementEvents, respondNudge } from "@/lib/api/w2";
import { Button } from "@/components/ui/Button";

type Nudge = { nudgeId: string; kind: string; copy: string };

const IDLE_MS = 90_000;

/**
 * G-02 confidence, G-03 idle nudge, G-04 frustration rescue — triggered by real signals, not buttons:
 * no activity for 90 s while answering (IDLE_DETECTED), two wrong answers in a row
 * (CONFUSION_RESCUE_TRIGGERED, once per session), and a confidence check every fifth answer.
 */
export function EngagementOverlays({
  sessionId,
  answering = true,
  wrongStreak = 0,
  answeredCount = 0,
}: {
  sessionId?: string;
  answering?: boolean;
  wrongStreak?: number;
  answeredCount?: number;
}) {
  const router = useRouter();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [confidence, setConfidence] = useState(false);
  const rescued = useRef(false);
  const lastConfidenceAt = useRef(0);

  async function fire(eventType: string) {
    try {
      const res = await engagementEvents([{ eventType, sessionId }]);
      const first = res.nudges?.[0];
      if (first) setNudge(first);
    } catch {
      // Engagement prompts are optional; never interrupt practice on failure.
    }
  }

  // Idle detection while a question is open.
  useEffect(() => {
    if (!answering) return;
    let timer = setTimeout(() => void fire("IDLE_DETECTED"), IDLE_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void fire("IDLE_DETECTED"), IDLE_MS);
    };
    const events = ["keydown", "pointerdown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answering, sessionId]);

  useEffect(() => {
    if (wrongStreak >= 2 && !rescued.current) {
      rescued.current = true;
      void fire("CONFUSION_RESCUE_TRIGGERED");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongStreak]);

  useEffect(() => {
    if (answeredCount > 0 && answeredCount % 5 === 0 && lastConfidenceAt.current !== answeredCount) {
      lastConfidenceAt.current = answeredCount;
      setConfidence(true);
      void fire("CONFIDENCE_PROMPT_SHOWN");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount]);

  async function respond(response: "ACCEPTED" | "DISMISSED") {
    const current = nudge;
    setNudge(null);
    setConfidence(false);
    if (current) {
      try {
        await respondNudge(current.nudgeId, response);
      } catch {
        /* best effort */
      }
      if (response === "ACCEPTED" && /RESCUE/i.test(current.kind)) router.push("/tutor");
    }
  }

  if (!nudge && !confidence) return null;
  const rescue = nudge && /RESCUE/i.test(nudge.kind);
  return (
    <div role="dialog" aria-label="A quick check-in" className="fixed bottom-20 left-1/2 z-40 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 animate-slide-up rounded-lg border border-neutral-200 bg-white p-4 shadow-overlay lg:bottom-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tealSoft text-brand-teal"><Lightbulb size={20} weight="fill" /></span>
        <p className="flex-1 pt-1 text-[15px] font-medium text-neutral-900">
          {nudge?.copy ?? "How sure were you about that answer? Thinking about it helps it stick."}
        </p>
        <button className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100" onClick={() => respond("DISMISSED")} aria-label="Dismiss">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="tertiary" onClick={() => respond("DISMISSED")}>Not now</Button>
        <Button size="sm" onClick={() => respond("ACCEPTED")}>{rescue ? "Talk to the tutor" : confidence && !nudge ? "Got it" : "Yes, please"}</Button>
      </div>
    </div>
  );
}
