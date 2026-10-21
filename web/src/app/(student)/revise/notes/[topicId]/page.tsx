"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, MasteryBadge, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Markdown } from "@/components/student/Markdown";
import { FailureView } from "@/components/student/StudentUI";
import { TopicNav } from "@/components/student/TopicNav";
import { useTopic } from "@/components/student/useTopic";
import { asArray, isRecord, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

/** GET /revision/topics/{id}/notes → { topicId, note: { bodyMd, readingLevel, version } | null, message? }. */
function readNotes(data: unknown): { bodies: string[]; readingLevel: string } {
  if (!isRecord(data)) return { bodies: [], readingLevel: "" };
  const note = isRecord(data.note) ? data.note : null;
  const direct = str(note?.bodyMd ?? data.bodyMd ?? data.body);
  const list = asArray(data.items)
    .filter(isRecord)
    .map((n) => str(n.bodyMd ?? n.body))
    .filter(Boolean);
  return { bodies: direct ? [direct] : list, readingLevel: str(note?.readingLevel) };
}

const READING_LEVEL: Record<string, string> = {
  "Y10-11": "GCSE level",
  "Y12-13": "A-Level",
  GCSE: "GCSE",
  "A-LEVEL": "A-Level",
  A_LEVEL: "A-Level",
};

/** Known bands get a friendly label; anything else (seeded or future values) is humanised, not shown raw. */
function readingLevelLabel(value: string): string {
  const known = READING_LEVEL[value] ?? READING_LEVEL[value.toUpperCase()];
  if (known) return known;
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** I-03 — Revision notes */
export default function Page() {
  const params = useParams<{ topicId: string }>();
  const topic = useTopic(params.topicId);
  const [data, setData] = useState<unknown>(null);
  const [failure, setFailure] = useState<LoadFailure | null>(null);

  const load = useCallback(async () => {
    setFailure(null);
    setData(null);
    try {
      const token = sessionStorage.getItem("accessToken") ?? undefined;
      const result: unknown = await api.revisionNotes(params.topicId, token);
      setData(result ?? {});
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, [params.topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { bodies, readingLevel } = readNotes(data);

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Revision notes"
        title={topic?.topicName ?? "Revision notes"}
        description={topic ? <MasteryBadge value={topic.mastery} /> : undefined}
        actions={<ButtonLink href="/revise" variant="tertiary" size="sm">All topics</ButtonLink>}
      />
      <TopicNav topicId={params.topicId} active="notes" />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : data === null ? (
        <LoadingState lines={8} />
      ) : bodies.length === 0 ? (
        <EmptyState
          title="No notes yet"
          body="Approved notes for this topic will appear here. Try a quick check in the meantime."
          action={<ButtonLink href={`/revise/check/${params.topicId}`}>Start 2-minute check</ButtonLink>}
        />
      ) : (
        <div className="animate-rise space-y-4">
          {readingLevel && (
            <div>
              <Badge tone="teal">{readingLevelLabel(readingLevel)}</Badge>
            </div>
          )}
          {bodies.map((b, i) => (
            <Card key={i} className="p-6 sm:p-8">
              <Markdown source={b} className="text-[16px]" />
            </Card>
          ))}
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="font-semibold text-neutral-900">Read it? See what stuck.</p>
            <ButtonLink href={`/revise/check/${params.topicId}`}>Start 2-minute check</ButtonLink>
          </Card>
        </div>
      )}
    </AppPage>
  );
}
