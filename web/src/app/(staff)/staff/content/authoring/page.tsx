"use client";

import { useEffect, useState } from "react";
import {
  createQuestion,
  ingestPastPaper,
  listPastPapers,
  patchLicence,
  registerPastPaper,
} from "@/lib/api/staff";
import { listSpecifications } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** E-02 — Authoring & past-paper import */
export default function AuthoringPage() {
  const [papers, setPapers] = useState<Record<string, unknown>[] | null>(null);
  const [specId, setSpecId] = useState<string>("");
  const [topicId, setTopicId] = useState("1");
  const [qText, setQText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    try {
      const p = await listPastPapers();
      setPapers(p.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CNT role required");
    }
  }

  useEffect(() => {
    listSpecifications()
      .then((r) => {
        const aqa = r.items.find((s) => s.specCode === "8462") ?? r.items[0];
        if (aqa) setSpecId(String(aqa.specificationId));
      })
      .catch(() => undefined);
    void reload();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Authoring & import</h1>
      <p className="mt-2 text-ink/70">Author a question or register a past paper (no PMT sources).</p>
      {error && (
        <div className="mt-6">
          <ErrorState body={error} />
        </div>
      )}
      {!papers && !error && (
        <div className="mt-6">
          <LoadingState />
        </div>
      )}

      <section className="mt-8 space-y-3">
        <h2 className="font-display text-xl">Author question</h2>
        <label className="block text-sm" htmlFor="qtext">
          Question text
        </label>
        <textarea
          id="qtext"
          className="w-full rounded-md border border-mist px-3 py-2"
          rows={3}
          value={qText}
          onChange={(e) => setQText(e.target.value)}
        />
        <label className="block text-sm" htmlFor="topic">
          Topic id
        </label>
        <input
          id="topic"
          className="rounded-md border border-mist px-3 py-2"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
        />
        <Button
          onClick={async () => {
            try {
              const q = await createQuestion({
                specificationId: Number(specId),
                topicId: Number(topicId),
                questionText: qText,
                questionType: "SHORT_ANSWER",
                marksAvailable: 1,
              });
              setNote(`Created question ${String(q.questionId)}`);
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Create failed");
            }
          }}
        >
          Create question
        </Button>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-xl">Register past paper</h2>
        <Button
          onClick={async () => {
            try {
              const paper = await registerPastPaper({
                specificationId: Number(specId),
                series: "JUN2023",
                examYear: 2023,
                paperCode: `W1-DEMO-${Date.now().toString().slice(-4)}`,
                title: "W1 demo paper",
                sourceUrl: "https://www.aqa.org.uk/subjects/science/gcse/chemistry-8462",
              });
              setNote(`Registered paper ${String(paper.paperId)}`);
              await reload();
            } catch (err) {
              setNote(err instanceof ApiError ? err.message : "Register failed");
            }
          }}
        >
          Register AQA-sourced paper
        </Button>
      </section>

      {papers && papers.length > 0 && (
        <ul className="mt-8 space-y-3">
          {papers.map((p) => {
            const id = String(p.paperId);
            return (
              <li key={id} className="rounded-md border border-mist bg-white/70 px-4 py-3">
                <p className="font-semibold">
                  {String(p.paperCode)} · {String(p.licenceStatus)} · {String(p.ingestStatus)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await patchLicence(id, "OFFICIAL_TEACHING_USE");
                        await reload();
                      } catch (err) {
                        setNote(err instanceof ApiError ? err.message : "Licence failed");
                      }
                    }}
                  >
                    Set licence
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const job = await ingestPastPaper(id);
                        setNote(`Ingest ${String(job.status)} job ${String(job.jobId)}`);
                        await reload();
                        const items = (job as { items?: unknown }).items;
                        if (Array.isArray(items) && items[0]) {
                          /* no-op */
                        }
                      } catch (err) {
                        setNote(err instanceof ApiError ? err.message : "Ingest failed");
                      }
                    }}
                  >
                    Run ingest stub
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {note && (
        <p className="mt-4 text-sm" role="status">
          {note}
        </p>
      )}
    </main>
  );
}
