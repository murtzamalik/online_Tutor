"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { navFor } from "@/components/shell/nav";
import { useSession } from "@/components/shell/session";
import { LoadingState } from "@/components/ui/states";

/** /staff — sends each staff member to the first tool their roles can open. */
export default function StaffIndexPage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.status !== "ready") return;
    const first = navFor("staff", session.roles)[0]?.items[0]?.href ?? "/staff/review";
    router.replace(first);
  }, [session, router]);

  return (
    <main className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <LoadingState label="Opening your workspace…" />
    </main>
  );
}
