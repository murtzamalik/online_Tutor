"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { ErrorState } from "@/components/ui/states";
import { createAssignment } from "@/lib/api/w2";

export default function NewAssignmentPage() {
  const { classId } = useParams<{ classId: string }>();
  const [title, setTitle] = useState("Week 1 practice");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <AppNav displayName="Teacher" />
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="font-display text-4xl">New assignment</h1>
        <label className="mt-6 block">Title<input className="mt-1 w-full rounded border p-2" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        {error && <div className="mt-4"><ErrorState body={error} /></div>}
        <button type="button" className="mt-6 rounded bg-accent px-4 py-2 text-white" onClick={() => createAssignment(classId, { title, topicIds: [1], questionCount: 10 }).then((r) => setMsg(r.assignmentId)).catch((e) => setError(e.message || "Failed"))}>Create</button>
        {msg && <p className="mt-3" role="status">Created {msg}</p>}
      </main>
    </div>
  );
}
