"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, ShieldCheck, Smiley, Student } from "@phosphor-icons/react";
import { forgotPassword, getMe, login } from "@/lib/api/auth";
import { destinationAfterLogin } from "@/lib/auth/post-login";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Callout, Field, Input } from "@/components/ui/primitives";

/** Shell-04 — Login / forgot password */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      if (mode === "forgot") {
        await forgotPassword(email);
        setMessage("If an account exists, a reset email was sent.");
        setStatus("ok");
        return;
      }
      const tokens = await login(email, password);
      if (tokens.mfaRequired) {
        window.location.href = `/staff/login?challenge=${encodeURIComponent(tokens.mfaChallengeToken ?? "")}`;
        return;
      }
      if (tokens.accessToken) {
        sessionStorage.setItem("accessToken", tokens.accessToken);
        if (tokens.refreshToken) sessionStorage.setItem("refreshToken", tokens.refreshToken);
        const me = await getMe(tokens.accessToken);
        if (me.studentId) sessionStorage.setItem("studentId", me.studentId);
        window.location.href = destinationAfterLogin(me.roles, me.kind);
        return;
      }
      window.location.href = "/home";
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        setMessage("Invalid credentials or rate limited.");
      } else if (err instanceof SchemaParseError) {
        setMessage("Sign-in response could not be read. Try again or contact support.");
      } else {
        setMessage("Unable to sign in.");
      }
    }
  }

  function switchMode(next: "login" | "forgot") {
    setMode(next);
    setStatus("idle");
    setMessage("");
  }

  const forgot = mode === "forgot";

  return (
    <AuthCard
      audience="family"
      title={forgot ? "Reset your password" : "Welcome back"}
      description={
        forgot
          ? "Enter your account email and we’ll send you a link to choose a new password."
          : "Log in to your parent or student account."
      }
      footer={
        <div className="space-y-4">
          <p>
            New to Study Loop?{" "}
            <Link href="/signup" className="font-semibold text-brand-navy hover:underline">
              Create a parent account
            </Link>
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { href: "/child-login", label: "Child picture login", icon: Smiley },
              { href: "/student/signup", label: "Student sign-up (13+)", icon: Student },
              { href: "/staff/login", label: "Staff login", icon: ShieldCheck },
            ].map(({ href, label, icon: LinkIcon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2.5 text-[14px] font-medium text-neutral-700 transition-colors duration-fast hover:border-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
              >
                <LinkIcon size={18} className="shrink-0 text-brand-navy" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="animate-rise space-y-5">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        {!forgot && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-[14px] font-semibold text-neutral-700">
                Password
              </label>
              <button
                type="button"
                className="rounded text-[14px] font-semibold text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
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
          </div>
        )}

        <div aria-live="polite">
          {status === "error" && (
            <Callout tone="danger" title={forgot ? "We couldn't send the reset link" : "We couldn't log you in"}>
              {message}
            </Callout>
          )}
          {status === "ok" && <Callout tone="success">{message}</Callout>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={status === "loading"}>
          {forgot ? "Send reset link" : "Log in"}
        </Button>

        {forgot && (
          <button
            type="button"
            className="w-full rounded text-center text-[14px] font-semibold text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
            onClick={() => switchMode("login")}
          >
            Back to login
          </button>
        )}
      </form>
    </AuthCard>
  );
}
