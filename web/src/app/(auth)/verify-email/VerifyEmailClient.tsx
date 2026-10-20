"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, EnvelopeSimpleOpen } from "@phosphor-icons/react";
import { resendVerificationEmail, verifyEmail } from "@/lib/api/auth-extra";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Field, Input } from "@/components/ui/primitives";

/** B-10 — Verify email */
export default function VerifyEmailClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");
  const [resend, setResend] = useState<{ busy: boolean; note: { ok: boolean; text: string } | null }>({ busy: false, note: null });

  useEffect(() => {
    // Query param wins; otherwise fall back to the address saved at sign-up (read after mount to avoid hydration mismatch).
    const fromQuery = params.get("email");
    if (fromQuery) {
      setEmail(fromQuery);
      return;
    }
    try {
      const saved = sessionStorage.getItem("pendingVerifyEmail");
      if (saved) setEmail((cur) => cur || saved);
    } catch {
      /* storage blocked */
    }
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await verifyEmail(email, code);
      setStatus("ok");
      setMessage("Email verified. You can log in.");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        setMessage(err.message);
      } else if (err instanceof SchemaParseError) {
        setMessage("Verification response invalid.");
      } else {
        setMessage("Verification failed.");
      }
    }
  }

  async function onResend() {
    if (!email) {
      setResend({ busy: false, note: { ok: false, text: "Enter your email address first." } });
      return;
    }
    setResend({ busy: true, note: null });
    try {
      await resendVerificationEmail(email);
      setResend({ busy: false, note: { ok: true, text: `A new code is on its way to ${email}.` } });
    } catch (err) {
      setResend({ busy: false, note: { ok: false, text: err instanceof ApiError ? err.message : "We couldn't send a new code. Please try again." } });
    }
  }

  if (status === "ok") {
    return (
      <AuthCard audience="family" title="Email verified" description="Your account is ready. Log in to add your children and start practising.">
        <div className="animate-rise space-y-6" role="status" aria-live="polite">
          <div className="flex items-start gap-3 rounded-lg border border-answer-correct/30 bg-[#E7F4EC] p-4 text-answer-correct">
            <CheckCircle size={24} weight="fill" className="shrink-0" />
            <p className="font-semibold">{message}</p>
          </div>
          <ButtonLink href="/login" size="lg" className="w-full">
            Continue to login
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      audience="family"
      title="Check your inbox"
      description="Enter the 6-digit code we emailed you to verify your account."
      footer={
        <p>
          Wrong address?{" "}
          <Link href="/signup" className="font-semibold text-brand-navy hover:underline">
            Sign up again
          </Link>
        </p>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-brand-navySoft px-4 py-3 text-[14px] text-brand-navy">
        <EnvelopeSimpleOpen size={22} className="shrink-0" aria-hidden />
        <span>
          {email ? (
            <>
              Sent to <span className="font-semibold">{email}</span>
            </>
          ) : (
            "Use the email address you signed up with."
          )}
        </span>
      </div>
      <form onSubmit={onSubmit} className="animate-rise space-y-5">
        <Field label="Email" htmlFor="ve-email">
          <Input id="ve-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Verification code" htmlFor="ve-code">
          <Input
            id="ve-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby="code-help"
            className="tabular h-14 text-center !text-[24px] font-semibold tracking-[0.5em]"
            placeholder="••••••"
          />
        </Field>
        <p id="code-help" className="-mt-3 text-caption text-neutral-600">
          Codes expire after 15 minutes.
        </p>
        <div aria-live="polite">
          {status === "error" && (
            <Callout tone="danger" title="That code didn't work">
              {message}
            </Callout>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={status === "loading"}>
          Verify email
        </Button>
        <div className="text-center text-[14px] text-neutral-600">
          Didn&apos;t get it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resend.busy}
            className="rounded font-semibold text-brand-navy hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
          >
            {resend.busy ? "sending…" : "send a new code"}
          </button>
          .
        </div>
        {resend.note && (
          <div aria-live="polite">
            <Callout tone={resend.note.ok ? "success" : "danger"}>{resend.note.text}</Callout>
          </div>
        )}
      </form>
    </AuthCard>
  );
}
