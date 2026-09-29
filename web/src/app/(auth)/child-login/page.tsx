"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { picturePinLogin } from "@/lib/api/auth-extra";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

const PICTURES = ["cat", "dog", "tree", "star", "book", "ball", "sun", "moon", "fish", "bird", "car", "bike"];

/** B-11 — Child picture-PIN login */
export default function ChildLoginPage() {
  const [loginHandle, setLoginHandle] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  function togglePic(key: string) {
    setSequence((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key].slice(0, 6)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const tokens = await picturePinLogin(loginHandle, sequence);
      if (tokens.accessToken) {
        sessionStorage.setItem("accessToken", tokens.accessToken);
        if (tokens.refreshToken) sessionStorage.setItem("refreshToken", tokens.refreshToken);
      }
      window.location.href = "/home";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Login failed.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl">Child login</h1>
      <p className="mt-2 text-ink/70">Enter your handle and tap your picture sequence in order.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-semibold">
          Login handle
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            required
            value={loginHandle}
            onChange={(e) => setLoginHandle(e.target.value)}
            autoComplete="username"
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Picture PIN ({sequence.length} selected)</legend>
          <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label="Picture choices">
            {PICTURES.map((p) => {
              const selected = sequence.includes(p);
              const order = sequence.indexOf(p) + 1;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePic(p)}
                  className={`rounded-md border px-2 py-3 text-sm capitalize ${
                    selected ? "border-accent bg-accent/10 font-semibold" : "border-mist bg-white"
                  }`}
                  aria-pressed={selected}
                >
                  {selected ? `${order}. ` : ""}
                  {p}
                </button>
              );
            })}
          </div>
        </fieldset>
        {status === "loading" && <LoadingState label="Signing in…" />}
        {status === "error" && <ErrorState body={message} />}
        <Button type="submit" className="w-full" disabled={sequence.length < 3}>
          Continue
        </Button>
      </form>
      <Link href="/login" className="mt-6 text-sm text-ink/70 underline">
        Parent login
      </Link>
    </main>
  );
}
