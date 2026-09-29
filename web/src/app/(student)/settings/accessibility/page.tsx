"use client";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState } from "@/components/ui/states";
import { AccessibilityForm } from "@/components/a11y/AccessibilityForm";

/** J-03 Accessibility settings panel */
export default function SettingsAccessibilityPage() {
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") ?? "" : "";
  return (
    <div>
      <AppNav displayName="Study Loop" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {!studentId ? <ErrorState body="Sign in as a student first." /> : <AccessibilityForm title="Accessibility settings" studentId={studentId} />}
        <p className="mt-6 text-sm"><Link className="underline" href="/home">Back home</Link></p>
      </main>
    </div>
  );
}
