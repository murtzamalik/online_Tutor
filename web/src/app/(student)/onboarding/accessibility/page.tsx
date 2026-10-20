"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AccessibilityPanel } from "@/components/student/AccessibilityPanel";
import { StepHeader } from "@/components/student/StudentUI";
import { readSession } from "@/components/student/studentData";

/** B-09 Onboarding accessibility */
export default function OnboardingAccessibilityPage() {
  const [studentId, setStudentId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setStudentId(readSession("studentId") ?? null);
  }, []);

  return (
    <AppPage width="content">
      <StepHeader
        step={3}
        title="Make it comfortable"
        description="Choose what helps you read and work. You can change these any time in Settings."
      />
      {studentId === undefined ? (
        <LoadingState />
      ) : !studentId ? (
        <EmptyState
          title="Sign in as a student first"
          body="These settings belong to a student profile."
          action={<ButtonLink href="/child-login">Student login</ButtonLink>}
        />
      ) : (
        <AccessibilityPanel
          studentId={studentId}
          footer={
            <ButtonLink href="/onboarding/diagnostic" variant="tertiary" icon={<ArrowRight size={16} />}>
              Next: diagnostic
            </ButtonLink>
          }
        />
      )}
    </AppPage>
  );
}
