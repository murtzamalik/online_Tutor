"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { registerParent } from "@/lib/api/auth-extra";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Callout, Checkbox, Field, Input } from "@/components/ui/primitives";

/** B-01 — Parent signup */
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (err instanceof ApiError) {
        setMessage(err.message);
      } else if (err instanceof SchemaParseError) {
        setMessage("Registration response could not be read. Try again or contact support.");
      } else {
        setMessage("Unable to register.");
      }
    }
  }

  const tooShort = password.length > 0 && password.length < 10;

  return (
    <AuthCard
      audience="family"
      title="Create a parent account"
      description="Start your free trial. You’ll verify your email before adding children."
      footer={
        <div className="space-y-2">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-navy hover:underline">
              Log in
            </Link>
          </p>
          <p>
            Aged 13 or over and signing up yourself?{" "}
            <Link href="/student/signup" className="font-semibold text-brand-navy hover:underline">
              Student sign-up
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="animate-rise space-y-5">
        <Field label="Your name" htmlFor="su-name">
          <Input id="su-name" required autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="su-email">
          <Input
            id="su-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="su-password"
          hint="At least 10 characters. A short phrase is easier to remember."
          error={tooShort ? `At least 10 characters — ${10 - password.length} to go.` : undefined}
        >
          <div className="relative">
            <Input
              id="su-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
              aria-invalid={tooShort || undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-neutral-400 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
            >
              {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </Field>
        <Checkbox
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          required
          label={
            <>
              I accept the{" "}
              <Link href="/legal/terms" className="font-medium text-brand-navy underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="font-medium text-brand-navy underline">
                privacy notice
              </Link>
              .
            </>
          }
        />

        <div aria-live="polite">
          {status === "error" && (
            <Callout tone="danger" title="We couldn't create your account">
              {message}
            </Callout>
          )}
          {status === "ok" && <Callout tone="success">Account created — taking you to email verification…</Callout>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={status === "loading" || status === "ok"}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
