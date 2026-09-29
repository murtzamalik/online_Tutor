"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/AppNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { listStudents } from "@/lib/api/students";
import { planPreview } from "@/lib/api/billing";

export default function PlanSubjectsPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const planId = 1;

  useEffect(() => {
    listStudents()
      .then(async (stu) => {
        setChildren(stu.items);
        if (stu.items[0]) {
          const p = await planPreview({
            planId,
            billingCycle: "MONTHLY",
            items: [{ studentId: stu.items[0].studentId, subjectId: 1, qualificationId: 1 }],
          });
          setPreview(p);
        }
      })
      .catch(() => setError("Could not load plan selector"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AppNav displayName="Parent" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl">Choose subjects</h1>
        <p className="mt-2 text-ink/70">Live price preview is computed server-side (BIL-18).</p>
        {loading && <div className="mt-8"><LoadingState /></div>}
        {error && <div className="mt-8"><ErrorState body={error} /></div>}
        {!loading && !error && children.length === 0 && (
          <div className="mt-8"><EmptyState title="No children" body="Add a child before selecting subjects." /></div>
        )}
        {preview && (
          <div className="mt-8 rounded-md border border-mist bg-white/70 p-4">
            <p className="font-semibold">Preview total</p>
            <p className="text-2xl">£{(preview.totalPence / 100).toFixed(2)} <span className="text-sm text-ink/60">incl. VAT</span></p>
            <Link className="mt-4 inline-block rounded bg-accent px-4 py-2 font-semibold text-white" href={`/parent/checkout?planId=${planId}`}>
              Continue to checkout
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
