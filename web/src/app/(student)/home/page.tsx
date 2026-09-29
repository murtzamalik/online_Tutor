"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { getMe, MeSchema } from "@/lib/api/auth";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { z } from "zod";

type Me = z.infer<typeof MeSchema>;

export default function StudentHomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setError("Sign in to continue.");
      return;
    }
    getMe(token)
      .then(setMe)
      .catch(() => setError("Could not load your profile."));
  }, []);

  return (
    <div>
      <AppNav displayName={me?.displayName} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {!me && !error && <LoadingState label="Loading your home…" />}
        {error && <ErrorState body={error} />}
        {me && (
          <EmptyState
            title={`Hello, ${me.displayName}`}
            body="Practice and revision open in Wave 1. Your session is live against /api/v1/me."
          />
        )}
      </main>
    </div>
  );
}
