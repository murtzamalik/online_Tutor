"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/w3";

/** /tutor — opens a fresh Socratic tutor session and moves into it. */
export default function TutorIndexPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Starting a session is not idempotent; Strict Mode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = sessionStorage.getItem("accessToken") ?? undefined;
    api
      .startTutor({ mode: "SOCRATIC" }, token)
      .then((s: any) => router.replace(`/tutor/${s.tutorSessionId}`))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) setForbidden(true);
        else setError("We couldn't start a tutor session. Please try again.");
      });
  }, [router]);

  return (
    <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
      {forbidden ? (
        <ForbiddenState body="The tutor chat has been turned off by your parent." />
      ) : error ? (
        <ErrorState body={error} />
      ) : (
        <LoadingState label="Starting your tutor…" />
      )}
    </main>
  );
}
