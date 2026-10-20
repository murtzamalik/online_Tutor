"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { TopicNav } from "@/components/student/TopicNav";
import { useTopic } from "@/components/student/useTopic";
import { toFailure, type LoadFailure } from "@/components/student/studentData";
import { startPractice } from "@/lib/api/practice";

/** I-05 — 2-minute knowledge check: starts a 4-question QUICK_CHECK session and moves straight into it. */
export default function Page() {
  const params = useParams<{ topicId: string }>();
  const router = useRouter();
  const topic = useTopic(params.topicId);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const started = useRef(false);

  const start = useCallback(async () => {
    setFailure(null);
    try {
      const enrolmentId = sessionStorage.getItem("enrolmentId");
      if (!enrolmentId) throw new Error("enrolmentId required");
      const topicId = Number(params.topicId);
      const result = await startPractice({
        enrolmentId,
        mode: "QUICK_CHECK",
        topicIds: Number.isFinite(topicId) ? [topicId] : undefined,
        plannedCount: 4,
      });
      router.replace(`/practice/${result.sessionId}`);
    } catch (e: unknown) {
      const f = toFailure(e, "Could not load");
      setFailure(f.message === "enrolmentId required" ? { kind: "error", message: "No active subject yet — open Home first." } : f);
    }
  }, [params.topicId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  return (
    <AppPage width="content">
      <PageHeader eyebrow="2-minute check" title={topic?.topicName ?? "Knowledge check"} description="Four quick questions to see what’s stuck." />
      <TopicNav topicId={params.topicId} active="check" />
      {failure ? (
        <FailureView
          failure={failure}
          onRetry={() => void start()}
          action={failure.message.startsWith("No active subject") ? <ButtonLink href="/home" variant="secondary" size="sm">Go to Home</ButtonLink> : undefined}
        />
      ) : (
        <LoadingState label="Setting up your check…" lines={3} />
      )}
    </AppPage>
  );
}
