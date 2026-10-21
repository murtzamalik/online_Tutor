"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardHeader, PageHeader, type Tone } from "@/components/ui/primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useSession } from "@/components/shell/session";
import { errorText, formatDate, num, readSession, str } from "@/components/student/studentData";
import { listMockPapers } from "@/lib/api/settings";

type MockRow = { mockId: string; status: string; score: number | null; totalMarks: number | null; durationMinutes: number | null; createdAt: unknown };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  SETUP: { label: "Not started", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  MARKED: { label: "Marked", tone: "success" },
};

/** Student results — every mock paper with its score, linking to the full breakdown. */
export default function Page() {
  const session = useSession();
  const [mocks, setMocks] = useState<MockRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentId = session?.studentId ?? readSession("studentId");
  const waiting = session?.status === "loading" && !studentId;

  useEffect(() => {
    if (waiting) return;
    if (!studentId) {
      setMocks([]);
      return;
    }
    let cancelled = false;
    setError(null);
    listMockPapers(String(studentId))
      .then((r) => {
        if (cancelled) return;
        setMocks(
          r.items.map((m) => ({
            mockId: str(m.mockId),
            status: str(m.status),
            score: num(m.score),
            totalMarks: num(m.totalMarks),
            durationMinutes: num(m.durationMinutes),
            createdAt: m.createdAt,
          })),
        );
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e, "We couldn't load your results."));
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, waiting]);

  return (
    <AppPage width="content">
      <PageHeader
        title="Results"
        description="Your mock papers and how you scored."
        actions={<ButtonLink href="/mock/new" size="sm">New mock</ButtonLink>}
      />

      <div aria-live="polite">
        {error ? (
          <ErrorState body={error} />
        ) : !mocks ? (
          <LoadingState label="Loading results…" />
        ) : mocks.length === 0 ? (
          <EmptyState
            title="No results yet"
            body="Sit a timed mock paper and your score will appear here."
            action={<ButtonLink href="/mock/new">Start a mock</ButtonLink>}
          />
        ) : (
          <Card>
            <CardHeader title="Mock papers" />
            <ul className="divide-y divide-neutral-100">
              {mocks.map((m) => {
                const s = STATUS[m.status] ?? { label: m.status || "Unknown", tone: "neutral" as Tone };
                const done = m.status === "MARKED" || m.status === "SUBMITTED";
                return (
                  <li key={m.mockId}>
                    <Link
                      href={done ? `/mock/${m.mockId}/results` : `/mock/${m.mockId}/sit`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-050"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-neutral-900">{formatDate(m.createdAt)}</span>
                        <span className="tabular text-caption text-neutral-600">
                          {m.durationMinutes != null ? `${m.durationMinutes} min` : ""}
                          {m.score != null && m.totalMarks != null
                            ? `${m.durationMinutes != null ? " · " : ""}${m.score} / ${m.totalMarks} marks`
                            : ""}
                        </span>
                      </span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </AppPage>
  );
}
