"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createMockPaper, mockResults } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** D-11 — Mock paper results */
export default function MockResultsPage() {
  const params = useParams<{ mockId: string }>();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const r = await mockResults(params.mockId);
      setResult(r);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load results");
    }
  }

  useEffect(() => {
    void load();
  }, [params.mockId]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Mock results</h1>
      <p className="mt-2 text-ink/70">Topic breakdown from result_json.</p>
      {!result && !error && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}
      {error && (
        <div className="mt-8 space-y-4">
          <ErrorState body={error} />
          <Button
            onClick={async () => {
              try {
                const created = await createMockPaper();
                const id = String(created.mockId ?? created.mock_id ?? "");
                if (id) {
                  window.location.href = `/mock/${id}/results`;
                }
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create demo mock");
              }
            }}
          >
            Create demo completed mock
          </Button>
        </div>
      )}
      {result && (
        <div className="mt-8 space-y-4">
          <p>
            Score: {String(result.score ?? "—")} / {String(result.totalMarks ?? "—")} ·{" "}
            {String(result.status ?? "")}
          </p>
          <pre className="overflow-auto rounded-md border border-mist bg-white/70 p-4 text-sm">
            {JSON.stringify(result.result ?? result.resultJson ?? result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
