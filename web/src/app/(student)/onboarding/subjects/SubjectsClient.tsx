"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Flask } from "@phosphor-icons/react";
import { listSpecifications, listSubjects, SpecificationSchema } from "@/lib/api/catalog";
import { createEnrolment, listEnrolments, listStudents } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AppPage } from "@/components/ui/AppPage";
import { Badge, Callout } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { SelectCard, StepHeader } from "@/components/student/StudentUI";
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
  const [loadFailed, setLoadFailed] = useState<"error" | "forbidden" | null>(null);
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
      } catch (err) {
        setLoadFailed(err instanceof ApiError && err.status === 403 ? "forbidden" : "error");
        setMessage("Could not load catalogue.");
        setStatus("error");
      }
    })();
  }, [studentId]);

  const aqa8462 = useMemo(() => specs?.find((s) => s.specCode === "8462") ?? null, [specs]);

  async function enrol() {
    if (!studentId || !selected) return;
    setStatus("loading");
    setMessage("");
    try {
      const existing = await listEnrolments(studentId);
      const hit = existing.items.find((e) => String(e.specificationId) === String(selected));
      const eid = hit
        ? hit.enrolmentId
        : (
            await createEnrolment(studentId, {
              specificationId: selected,
              tier: "HIGHER",
              goalType: "EXAM_PREP",
            })
          ).enrolmentId;
      setEnrolmentId(eid);
      sessionStorage.setItem("enrolmentId", eid);
      sessionStorage.setItem("studentId", studentId);
      setStatus("ok");
      setMessage("Next, set a goal and a daily target. Practice happens on the child’s own login.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Enrolment failed.");
    }
  }

  return (
    <AppPage width="content">
      <StepHeader step={1} title="Choose a subject track" description="Pick the exam board and specification you’re studying. Pilot focus: AQA GCSE Chemistry 8462." />

      {loadFailed === "forbidden" ? (
        <ForbiddenState body="Only a parent or the student can choose subjects for this profile." />
      ) : loadFailed === "error" ? (
        <ErrorState body={message || "Could not load catalogue."} />
      ) : !specs ? (
        <LoadingState label="Loading specifications…" lines={4} />
      ) : specs.length === 0 ? (
        <EmptyState
          title="No specifications yet"
          body="We couldn’t find any courses in the catalogue. Please try again later."
          action={<ButtonLink href="/home" variant="secondary">Back to Home</ButtonLink>}
        />
      ) : (
        <>
          <div className="space-y-3" role="listbox" aria-label="Specifications">
            {specs.map((s) => (
              <SelectCard
                key={String(s.specificationId)}
                role="option"
                selected={selected === s.specificationId}
                onSelect={() => setSelected(s.specificationId)}
                icon={<Flask size={20} />}
                title={s.title ?? s.boardCode ?? s.specCode}
                description={[s.boardCode, s.qualificationCode, `Spec ${s.specCode}`].filter(Boolean).join(" · ")}
                badge={aqa8462 && s.specificationId === aqa8462.specificationId ? <Badge tone="teal">Recommended</Badge> : undefined}
              />
            ))}
          </div>
          {chemSubjectId == null && (
            <p className="mt-3 text-caption text-neutral-600">Showing all specifications (Chemistry subject filter unavailable).</p>
          )}
        </>
      )}

      {status === "error" && !loadFailed && message && (
        <Callout tone="danger" title="Not enrolled" className="mt-6">
          {message}
        </Callout>
      )}

      {status === "ok" && enrolmentId ? (
        <div className="mt-8 space-y-4" aria-live="polite">
          <Callout tone="success" title="You’re enrolled">
            {message || "Enrolled successfully."}
          </Callout>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/onboarding/goals?studentId=${studentId}`} icon={<ArrowRight size={18} />}>
              Next: set goals
            </ButtonLink>
            <ButtonLink href="/child-login" variant="secondary">
              Child login
            </ButtonLink>
            <ButtonLink href="/parent" variant="tertiary">
              Back to parent home
            </ButtonLink>
          </div>
        </div>
      ) : (
        specs &&
        specs.length > 0 && (
          <div className="mt-8 flex justify-end">
            <Button size="lg" onClick={enrol} disabled={!selected || !studentId} loading={status === "loading"}>
              Enrol
            </Button>
          </div>
        )
      )}
    </AppPage>
  );
}
