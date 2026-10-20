"use client";

import { useEffect, useState } from "react";
import { AppPage } from "@/components/ui/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/primitives";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AccessibilityPanel } from "@/components/student/AccessibilityPanel";
import { readSession } from "@/components/student/studentData";

/** J-03 Accessibility settings panel */
export default function SettingsAccessibilityPage() {
  const [studentId, setStudentId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setStudentId(readSession("studentId") ?? null);
  }, []);

  return (
    <AppPage width="content">
      <PageHeader title="Settings" description="Make Study Loop comfortable to read, hear and use." eyebrow="Accessibility" />
      {studentId === undefined ? (
        <LoadingState label="Loading your settings…" />
      ) : !studentId ? (
        <EmptyState
          title="Sign in as a student first"
          body="These settings belong to a student profile. Open Home to load yours."
          action={<ButtonLink href="/home">Go to Home</ButtonLink>}
        />
      ) : (
        <AccessibilityPanel studentId={studentId} />
      )}
    </AppPage>
  );
}
