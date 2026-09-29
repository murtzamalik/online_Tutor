"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api/auth-extra";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** B-10 — Verify email */
export default function VerifyEmailClient() {
  const params = useSearchParams();
  const initialEmail = useMemo(() => {
    const fromQuery = params.get("email");
    if (fromQuery) return fromQuery;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("pendingVerifyEmail") ?? "";
    }
    return "";
  }, [params]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await verifyEmail(email, code);
      setStatus("ok");
      setMessage("Email verified. You can log in.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Verification failed.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl">Verify your email</h1>
      <p className="mt-2 text-ink/70">Enter the 6-digit code sent to your inbox (or Mailpit in local).</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-semibold">
          Email
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Verification code
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="code-help"
          />
        </label>
        <p id="code-help" className="text-xs text-ink/60">
          Codes expire after 15 minutes.
        </p>
        {status === "loading" && <LoadingState label="Verifying…" />}
        {status === "error" && <ErrorState body={message} />}
        {status === "ok" && <p className="text-success">{message}</p>}
        <Button type="submit" className="w-full">
          Verify
        </Button>
      </form>
      {status === "ok" && (
        <Link href="/login" className="mt-6 text-sm font-semibold text-accent underline">
          Continue to login
        </Link>
      )}
    </main>
  );
}
