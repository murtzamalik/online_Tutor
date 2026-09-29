"use client";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState } from "@/components/ui/states";
import { AccessibilityForm } from "@/components/a11y/AccessibilityForm";

/** B-09 Onboarding accessibility */
export default function OnboardingAccessibilityPage() {
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") ?? "" : "";
  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {!studentId ? <ErrorState body="Sign in as a student first." /> : <AccessibilityForm title="Accessibility preferences" studentId={studentId} />}
        <p className="mt-6 text-sm"><Link className="underline" href="/settings/accessibility">Open settings panel (J-03)</Link></p>
      </main>
    </div>
  );
}
