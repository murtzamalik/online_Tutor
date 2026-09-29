"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createStudent, setPicturePin, under13Consent } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

const PICTURES = ["cat", "dog", "tree", "star", "book", "ball", "sun", "moon"];

/** B-02 — Add child + picture PIN + under-13 consent when needed */
export default function NewChildPage() {
  const [displayName, setDisplayName] = useState("");
  const [yearGroup, setYearGroup] = useState("Y9");
  const [birthMonth, setBirthMonth] = useState("2014-01-01");
  const [sequence, setSequence] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");
  const [loginHandle, setLoginHandle] = useState<string | null>(null);

  function togglePic(key: string) {
    setSequence((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key].slice(0, 6)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const created = await createStudent({ displayName, yearGroup, birthMonth });
      if (created.requiresUnder13Consent) {
        await under13Consent(created.studentId);
      }
      if (sequence.length >= 3) {
        const pin = await setPicturePin(created.studentId, sequence);
        setLoginHandle(pin.loginHandle);
      }
      setStatus("ok");
      setMessage("Child profile created.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not create child.");
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-4xl">Add a child</h1>
      <p className="mt-2 text-ink/70">Creates a learner profile and optional picture PIN.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-semibold">
          Display name
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Year group
          <select
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            value={yearGroup}
            onChange={(e) => setYearGroup(e.target.value)}
          >
            {["Y7", "Y8", "Y9", "Y10", "Y11"].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Birth month (first of month)
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            type="date"
            required
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Picture PIN (optional, min 3)</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {PICTURES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePic(p)}
                className={`rounded-md border px-2 py-3 text-sm capitalize ${
                  sequence.includes(p) ? "border-accent bg-accent/10" : "border-mist bg-white"
                }`}
                aria-pressed={sequence.includes(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>
        {status === "loading" && <LoadingState label="Saving…" />}
        {status === "error" && <ErrorState body={message} />}
        {status === "ok" && (
          <p className="text-success">
            {message}
            {loginHandle ? ` Login handle: ${loginHandle}` : ""}
          </p>
        )}
        <Button type="submit" className="w-full">
          Save child
        </Button>
      </form>
      <Link href="/parent" className="mt-6 inline-block text-sm underline">
        Back to parent home
      </Link>
    </main>
  );
}
