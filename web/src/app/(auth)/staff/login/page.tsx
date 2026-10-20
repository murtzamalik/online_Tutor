"use client";

import { FormEvent, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DeviceMobile, LockKey } from "@phosphor-icons/react";
import { getMe, login, verifyMfa } from "@/lib/api/auth";
import { destinationAfterLogin } from "@/lib/auth/post-login";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Callout, Field, Input } from "@/components/ui/primitives";
import { LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <ol className="mb-6 flex items-center gap-3 text-caption font-semibold" aria-label="Sign-in steps">
      {[
        { n: 1, label: "Password", icon: LockKey },
        { n: 2, label: "Authenticator", icon: DeviceMobile },
      ].map(({ n, label, icon: StepIcon }, i) => (
        <li key={n} className="flex items-center gap-3" aria-current={step === n ? "step" : undefined}>
          {i > 0 && <span aria-hidden className="h-px w-8 bg-neutral-200" />}
          <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1", step === n ? "bg-brand-navySoft text-brand-navy" : step > n ? "text-answer-correct" : "text-neutral-400")}>
            <StepIcon size={14} aria-hidden />
            {n}. {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

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
      if (tokens.accessToken) {
        sessionStorage.setItem("accessToken", tokens.accessToken);
        if (tokens.refreshToken) sessionStorage.setItem("refreshToken", tokens.refreshToken);
        const me = await getMe(tokens.accessToken);
        window.location.href = destinationAfterLogin(me.roles, me.kind);
        return;
      }
      window.location.href = "/staff/review";
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        setMessage("Sign-in failed.");
      } else if (err instanceof SchemaParseError) {
        setMessage("Sign-in response could not be read. Try again or contact support.");
      } else {
        setMessage("Unable to reach API.");
      }
    }
  }

  async function onMfa(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const tokens = await verifyMfa(challenge, code);
      if (tokens.accessToken) {
        sessionStorage.setItem("accessToken", tokens.accessToken);
        if (tokens.refreshToken) sessionStorage.setItem("refreshToken", tokens.refreshToken);
        const me = await getMe(tokens.accessToken);
        window.location.href = destinationAfterLogin(me.roles, me.kind);
        return;
      }
      window.location.href = "/staff/review";
    } catch {
      setStatus("error");
      setMessage("Invalid MFA code.");
    }
  }

  const mfaStep = !!challenge;

  return (
    <AuthCard
      audience="staff"
      title="Staff login"
      description="Two-step verification is required for privileged roles."
      footer={
        <p>
          Not staff?{" "}
          <Link href="/login" className="font-semibold text-brand-navy hover:underline">
            Parent and student login
          </Link>
        </p>
      }
    >
      <Steps step={mfaStep ? 2 : 1} />
      {!mfaStep ? (
        <form onSubmit={onLogin} className="animate-rise space-y-5">
          <Field label="Work email" htmlFor="staff-email">
            <Input
              id="staff-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="staff-password">
            <Input
              id="staff-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div aria-live="polite">
            {status === "error" && (
              <Callout tone="danger" title="We couldn't sign you in">
                {message}
              </Callout>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" loading={status === "loading"}>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onMfa} className="animate-rise space-y-5">
          <Field
            label="Authenticator code"
            htmlFor="staff-code"
            hint="Open your authenticator app and enter the 6-digit code for Study Loop."
          >
            <Input
              id="staff-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="tabular h-14 text-center !text-[24px] font-semibold tracking-[0.5em]"
              placeholder="••••••"
            />
          </Field>
          <div aria-live="polite">
            {status === "error" && (
              <Callout tone="danger" title="Code not accepted">
                {message} Codes refresh every 30 seconds — try the latest one.
              </Callout>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" loading={status === "loading"}>
            Verify
          </Button>
          <button
            type="button"
            className="w-full rounded text-center text-[14px] font-semibold text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
            onClick={() => {
              setChallenge("");
              setCode("");
              setStatus("idle");
              setMessage("");
            }}
          >
            Use a different account
          </button>
        </form>
      )}
    </AuthCard>
  );
}

/** Shell-09 — Web login + staff MFA */
export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCard audience="staff" title="Staff login">
          <LoadingState label="Loading staff login…" />
        </AuthCard>
      }
    >
      <StaffLoginInner />
    </Suspense>
  );
}
