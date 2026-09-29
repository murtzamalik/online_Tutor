"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listQualifications, listSpecifications } from "@/lib/api/catalog";

/** A-01 — Marketing home with live CAT data + static copy */
export default function MarketingHome() {
  const [qualCount, setQualCount] = useState<number | null>(null);
  const [pilotSpec, setPilotSpec] = useState<string | null>(null);

  useEffect(() => {
    listQualifications()
      .then((r) => setQualCount(r.items.length))
      .catch(() => setQualCount(null));
    listSpecifications()
      .then((r) => {
        const aqa = r.items.find((s) => s.specCode === "8462");
        setPilotSpec(aqa ? `${aqa.specCode} — ${aqa.title ?? "AQA GCSE Chemistry"}` : null);
      })
      .catch(() => setPilotSpec(null));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, #d8efe8 0%, transparent 45%), radial-gradient(ellipse at 80% 0%, #f0e6d8 0%, transparent 40%), linear-gradient(180deg, #f7f4ef 0%, #eef3f0 100%)",
        }}
      />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="font-display text-5xl text-ink md:text-7xl animate-rise">Study Loop</p>
        <p className="mt-4 max-w-xl text-lg text-ink/75 animate-rise">
          Adaptive practice and instant marking for UK exams — privacy-first for families and schools.
        </p>
        {qualCount != null && (
          <p className="mt-3 text-sm text-ink/60">
            Catalogue live: {qualCount} qualification{qualCount === 1 ? "" : "s"}
            {pilotSpec ? ` · Pilot track ${pilotSpec}` : ""}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-accent px-5 py-3 font-semibold text-white" href="/signup">
            Start free as a parent
          </Link>
          <Link className="rounded-md border border-mist bg-white/70 px-5 py-3 font-semibold" href="/login">
            Log in
          </Link>
          <Link className="rounded-md border border-mist bg-white/70 px-5 py-3 font-semibold" href="/child-login">
            Child login
          </Link>
          <Link className="rounded-md border border-mist bg-white/40 px-5 py-3 text-sm font-semibold" href="/staff/login">
            Staff
          </Link>
        </div>
      </div>
    </main>
  );
}
