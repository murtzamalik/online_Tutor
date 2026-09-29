"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { forgotPassword, login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/states";

/** Shell-04 — Login / forgot password */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      }
      window.location.href = "/home";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? "Invalid credentials or rate limited." : "Unable to sign in.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-4xl">Log in</h1>
      <p className="mt-2 text-ink/70">Parents and students. Staff MFA is on the staff login page.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 animate-rise">
        <label className="block text-sm font-semibold">
          Email
          <input
            className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === "login" && (
          <label className="block text-sm font-semibold">
            Password
            <input
              className="mt-1 w-full rounded-md border border-mist bg-white px-3 py-3"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {status === "loading" && <LoadingState label="Signing in…" />}
        {status === "error" && <ErrorState body={message} />}
        {status === "ok" && <p className="text-success">{message}</p>}
        <Button type="submit" className="w-full">
          {mode === "login" ? "Continue" : "Send reset link"}
        </Button>
      </form>
      <button
        type="button"
        className="mt-4 text-left text-sm font-semibold text-accent"
        onClick={() => setMode(mode === "login" ? "forgot" : "login")}
      >
        {mode === "login" ? "Forgot password?" : "Back to login"}
      </button>
      <Link href="/staff/login" className="mt-6 text-sm text-ink/70 underline">
        Staff login
      </Link>
    </main>
  );
}
