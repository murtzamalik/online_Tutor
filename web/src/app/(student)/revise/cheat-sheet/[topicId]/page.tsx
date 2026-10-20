"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, MasteryBadge, PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { FailureView } from "@/components/student/StudentUI";
import { TopicNav } from "@/components/student/TopicNav";
import { useTopic } from "@/components/student/useTopic";
import { asArray, isRecord, parseJsonish, str, toFailure, type LoadFailure } from "@/components/student/studentData";
import * as api from "@/lib/api/w3";

type Entry = { term: string; detail: string };
type Section = { title: string; entries: Entry[] };

/** cheat_sheet.content_json: { sections: [{ title, items: [string | { term, definition }] }] }. */
function readSheet(data: unknown): Section[] | null {
  if (!isRecord(data)) return null;
  const sheet = isRecord(data.sheet) ? data.sheet : null;
  if (!sheet) return null;
  const content = parseJsonish(sheet.contentJson ?? sheet.content);
  const sections = isRecord(content) ? asArray(content.sections) : asArray(content);
  return sections.filter(isRecord).map((s, i) => ({
    title: str(s.title ?? s.heading, `Section ${i + 1}`),
    entries: asArray(s.items ?? s.entries).map((it) => {
      if (isRecord(it)) {
        return { term: str(it.term ?? it.label ?? it.name ?? it.text), detail: str(it.definition ?? it.detail ?? it.value ?? it.formula) };
      }
      return { term: str(it), detail: "" };
    }),
  }));
}

/** I-04 — Cheat sheet */
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
      const result: unknown = await api.cheatSheet(params.topicId, token);
      setData(result ?? {});
    } catch (e: unknown) {
      setFailure(toFailure(e, "Could not load"));
    }
  }, [params.topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = data === null ? null : readSheet(data);

  return (
    <AppPage width="content">
      <PageHeader
        eyebrow="Cheat sheet"
        title={topic?.topicName ?? "Cheat sheet"}
        description={topic ? <MasteryBadge value={topic.mastery} /> : undefined}
        actions={
          sections && sections.length > 0 ? (
            <Button variant="tertiary" size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>
              Print
            </Button>
          ) : (
            <ButtonLink href="/revise" variant="tertiary" size="sm">
              All topics
            </ButtonLink>
          )
        }
      />
      <TopicNav topicId={params.topicId} active="cheat-sheet" />

      {failure ? (
        <FailureView failure={failure} onRetry={() => void load()} />
      ) : data === null ? (
        <LoadingState lines={6} />
      ) : !sections || sections.length === 0 ? (
        <EmptyState
          title="No cheat sheet yet"
          body="This topic’s one-page summary isn’t ready. The full notes are a good place to start."
          action={<ButtonLink href={`/revise/notes/${params.topicId}`}>Read the notes</ButtonLink>}
        />
      ) : (
        <div className="animate-rise grid gap-4 sm:grid-cols-2">
          {sections.map((s, i) => (
            <Card key={i} className={s.entries.length > 6 ? "sm:col-span-2" : undefined}>
              <CardHeader title={s.title} />
              <CardBody>
                {s.entries.length === 0 ? (
                  <p className="text-[14px] text-neutral-600">—</p>
                ) : (
                  <ul className="space-y-2">
                    {s.entries.map((e, j) => (
                      <li key={j} className="flex gap-2 text-[15px] leading-snug text-neutral-800">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                        <span>
                          <span className="font-semibold text-neutral-900">{e.term}</span>
                          {e.detail && <span className="text-neutral-700"> — {e.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AppPage>
  );
}
