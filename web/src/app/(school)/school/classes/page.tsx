"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { schoolClasses } from "@/lib/api/w2";

const SCHOOL = "a1000000-0000-4000-8000-000000000001";

export default function ClassesPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { schoolClasses(SCHOOL).then((r) => setItems(r.items)).catch(() => setError("Could not load classes (school role required)")); }, []);
  return (
    <div>
      <AppNav displayName="Teacher" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Classes</h1>
        {!items && !error && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {items && items.length === 0 && <div className="mt-8"><EmptyState title="No classes" body="Create a class to begin." /></div>}
        <ul className="mt-8 space-y-3">
          {items?.map((c) => (
            <li key={c.classId} className="rounded border p-4">
              <p className="font-semibold">{c.name}</p>
              <div className="mt-2 flex gap-3 text-sm">
                <Link className="underline" href={`/school/classes/${c.classId}/assignments/new`}>New assignment</Link>
                <Link className="underline" href={`/school/classes/${c.classId}/insights`}>Insights</Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
