"use client";

import { FormEvent, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, verifyMfa } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

function StaffLoginInner() {
  const params = useSearchParams();
  const initialChallenge = useMemo(() => params.get("challenge") ?? "", [params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(initialChallenge);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const tokens = await login(email, password);
      if (tokens.mfaRequired && tokens.mfaChallengeToken) {
        setChallenge(tokens.mfaChallengeToken);
        setStatus("idle");
        return;
      }
      if (tokens.accessToken) sessionStorage.setItem("accessToken", tokens.accessToken);
      window.location.href = "/home";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? "Sign-in failed." : "Unable to reach API.");
    }
  }

  async function onMfa(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const tokens = await verifyMfa(challenge, code);
      if (tokens.accessToken) sessionStorage.setItem("accessToken", tokens.accessToken);
      window.location.href = "/home";
    } catch {
      setStatus("error");
      setMessage("Invalid MFA code.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl">Staff login</h1>
      <p className="mt-2 text-ink/70">Two-step verification is required for privileged roles.</p>
      {!challenge ? (
        <form onSubmit={onLogin} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">
            Work email
            <input
              className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
              type="email"
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {status === "loading" && <LoadingState />}
          {status === "error" && <ErrorState body={message} />}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onMfa} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">
            Authenticator code
            <input
              className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {status === "loading" && <LoadingState label="Verifying…" />}
          {status === "error" && <ErrorState body={message} />}
          <Button type="submit" className="w-full">
            Verify
          </Button>
        </form>
      )}
    </main>
  );
}

/** Shell-09 — Web login + staff MFA */
export default function StaffLoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading staff login…" />}>
      <StaffLoginInner />
    </Suspense>
  );
}
