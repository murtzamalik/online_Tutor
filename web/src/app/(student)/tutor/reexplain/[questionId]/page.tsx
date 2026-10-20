"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChatsCircle, Sparkle } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { Markdown } from "@/components/student/Markdown";
import { isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

const FORMAT_LABEL: Record<string, string> = {
  WORKED_EXAMPLE: "Worked example",
  ANALOGY: "Analogy",
  STEP_BY_STEP: "Step by step",
  VISUAL: "Visual",
};

/** F-06 — Re-explain concept (POST /tutor/reexplain → { format, text }). */
export default function Page() {
  const params = useParams<{ questionId: string }>();
  const [data, setData] = useState<{ format: string; text: string } | null>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const requested = useRef(false);

  const load = useCallback(async () => {
    setFailure(null);
    setData(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const result: unknown = await api.reexplain({ questionId: Number(params.questionId) }, token);
      setData(isRecord(result) ? { format: str(result.format), text: str(result.text ?? result.explanation) } : { format: "", text: "" });
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, [params.questionId]);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load();
  }, [load]);

  return (
    <AppPage width="content">
      <PageHeader eyebrow="Tutor" title="Another way to see it" description="A fresh explanation of the idea behind this question." />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} forbiddenBody="The tutor has been turned off by your parent." />
      ) : !data ? (
        <LoadingState label="Writing a new explanation…" lines={4} />
      ) : !data.text ? (
        <EmptyState
          title="No explanation this time"
          body="The tutor couldn’t produce one for this question. Try talking it through instead."
          action={<ButtonLink href="/tutor">Ask the tutor</ButtonLink>}
        />
      ) : (
        <div className="animate-rise space-y-5">
          <Card className="border-brand-teal/30 bg-brand-tealSoft/50 p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white">
                <Sparkle size={16} weight="fill" />
              </span>
              <p className="font-semibold text-brand-teal">Tutor</p>
              {data.format && <Badge tone="teal">{FORMAT_LABEL[data.format] ?? data.format.replace(/_/g, " ").toLowerCase()}</Badge>}
            </div>
            <Markdown source={data.text} className="mt-4 text-[16px]" />
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/tutor" icon={<ChatsCircle size={18} />}>
              Talk it through with the tutor
            </ButtonLink>
            <ButtonLink href="/practice" variant="secondary">
              Back to practice
            </ButtonLink>
          </div>
        </div>
      )}
    </AppPage>
  );
}
