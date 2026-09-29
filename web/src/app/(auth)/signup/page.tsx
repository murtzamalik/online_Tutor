"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { registerParent } from "@/lib/api/auth-extra";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** B-01 — Parent signup */
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await registerParent({ email, password, displayName, acceptTerms });
      sessionStorage.setItem("pendingVerifyEmail", email);
      setStatus("ok");
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Unable to register.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl">Create a parent account</h1>
      <p className="mt-2 text-ink/70">You will verify your email before adding children.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-semibold">
          Your name
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            I accept the{" "}
            <Link href="/legal/terms" className="underline">
              terms
            </Link>{" "}
            and privacy notice.
          </span>
        </label>
        {status === "loading" && <LoadingState label="Creating account…" />}
        {status === "error" && <ErrorState body={message} />}
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>
      <Link href="/login" className="mt-6 text-sm text-ink/70 underline">
        Already have an account?
      </Link>
    </main>
  );
}
