"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { listSpecifications, listSubjects, SpecificationSchema } from "@/lib/api/catalog";
import { createEnrolment, listEnrolments, listStudents } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { z } from "zod";

type Spec = z.infer<typeof SpecificationSchema>;

/** B-04 — Subject / board-track selector */
export default function OnboardingSubjectsPage() {
  const params = useSearchParams();
  const studentIdParam = params.get("studentId");
  const [studentId, setStudentId] = useState(studentIdParam ?? "");
  const [specs, setSpecs] = useState<Spec[] | null>(null);
  const [chemSubjectId, setChemSubjectId] = useState<string | number | null>(null);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!studentId) {
          const kids = await listStudents();
          if (kids.items[0]) setStudentId(kids.items[0].studentId);
        }
        const subjects = await listSubjects();
        const chem = subjects.items.find((s) => s.code === "CHEMISTRY" || /chem/i.test(s.displayName));
        setChemSubjectId(chem?.subjectId ?? null);
        const list = await listSpecifications(chem ? { subjectId: chem.subjectId } : undefined);
        setSpecs(list.items);
      } catch {
        setMessage("Could not load catalogue.");
        setStatus("error");
      }
    })();
  }, [studentId]);

  const aqa8462 = useMemo(
    () => specs?.find((s) => s.specCode === "8462") ?? null,
    [specs],
  );

  async function enrol() {
    if (!studentId || !selected) return;
    setStatus("loading");
    try {
      const existing = await listEnrolments(studentId);
      const hit = existing.items.find((e) => String(e.specificationId) === String(selected));
      if (hit) {
        setEnrolmentId(hit.enrolmentId);
      } else {
        const created = await createEnrolment(studentId, {
          specificationId: selected,
          tier: "HIGHER",
          goalType: "EXAM_PREP",
        });
        setEnrolmentId(created.enrolmentId);
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Enrolment failed.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Choose a subject track</h1>
      <p className="mt-2 text-ink/70">Pilot focus: AQA GCSE Chemistry 8462.</p>
      {!specs && status !== "error" && <div className="mt-8"><LoadingState label="Loading specifications…" /></div>}
      {status === "error" && <div className="mt-8"><ErrorState body={message} /></div>}
      {specs && specs.length === 0 && (
        <div className="mt-8"><EmptyState title="No specifications" body="Catalogue seed may be missing." /></div>
      )}
      {specs && specs.length > 0 && (
        <ul className="mt-8 space-y-2" role="listbox" aria-label="Specifications">
          {specs.map((s) => (
            <li key={String(s.specificationId)}>
              <button
                type="button"
                role="option"
                aria-selected={selected === s.specificationId}
                onClick={() => setSelected(s.specificationId)}
                className={`w-full rounded-md border px-4 py-3 text-left ${
                  selected === s.specificationId ? "border-accent bg-accent/10" : "border-mist bg-white"
                }`}
              >
                <span className="font-semibold">{s.specCode}</span>
                <span className="ml-2 text-ink/70">{s.title ?? s.boardCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aqa8462 && selected !== aqa8462.specificationId && (
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-accent underline"
          onClick={() => setSelected(aqa8462.specificationId)}
        >
          Prefer AQA 8462 for the demo
        </button>
      )}
      <div className="mt-8 flex gap-3">
        <Button onClick={enrol} disabled={!selected || !studentId || status === "loading"}>
          Enrol
        </Button>
        {enrolmentId && (
          <Link
            className="rounded-md border border-mist px-4 py-2 font-semibold"
            href={`/onboarding/diagnostic?studentId=${studentId}&enrolmentId=${enrolmentId}`}
          >
            Start diagnostic
          </Link>
        )}
      </div>
      {chemSubjectId == null && specs && (
        <p className="mt-4 text-xs text-ink/50">Showing all specifications (Chemistry subject filter unavailable).</p>
      )}
    </main>
  );
}
