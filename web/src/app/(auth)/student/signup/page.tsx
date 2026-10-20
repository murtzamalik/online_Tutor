"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout, Checkbox, Field, Input } from "@/components/ui/primitives";
import * as api from "@/lib/api/w3";

/** B-03 — Student sign-up (13+) */
export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [age, setAge] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Capture the form before awaiting: React clears event.currentTarget after the handler returns.
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData(form);
    try {
      await api.registerStudent({
        email: String(fd.get("email")),
        password: String(fd.get("password")),
        displayName: String(fd.get("displayName")),
        ageYears: Number(fd.get("ageYears")),
        parentAware: fd.get("parentAware") === "on",
        acceptTerms: fd.get("acceptTerms") === "on",
      });
      setSuccess("Account created. Check your email to verify, then log in.");
      form.reset();
      setAge("");
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  const ageNum = Number(age);
  const needsParent = age !== "" && ageNum >= 13 && ageNum <= 15;
  const under13 = age !== "" && ageNum > 0 && ageNum < 13;

  return (
    <AuthCard
      audience="student"
      title="Create your student account"
      description="For learners aged 13 and over. Under 13? Ask a parent to sign up and add you."
      footer={
        <div className="space-y-2">
          <p>
            Already have an account?{" "}
            <Link className="font-semibold text-brand-navy hover:underline" href="/login">
              Log in
            </Link>
          </p>
          <p>
            Parent or carer?{" "}
            <Link className="font-semibold text-brand-navy hover:underline" href="/signup">
              Create a parent account
            </Link>
          </p>
        </div>
      }
    >
      {success ? (
        <div className="animate-rise space-y-5" role="status" aria-live="polite">
          <div className="flex items-start gap-3 rounded-lg border border-answer-correct/30 bg-[#E7F4EC] p-4 text-answer-correct">
            <CheckCircle size={24} weight="fill" className="shrink-0" />
            <div>
              <p className="font-semibold">You&apos;re nearly there</p>
              <p className="mt-0.5 text-[14px]">{success}</p>
            </div>
          </div>
          <ButtonLink href="/login" size="lg" className="w-full">
            Go to login
          </ButtonLink>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="animate-rise space-y-5">
          <Field label="First name" htmlFor="st-name">
            <Input id="st-name" name="displayName" required autoComplete="given-name" />
          </Field>
          <Field label="Email" htmlFor="st-email">
            <Input id="st-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </Field>
          <Field label="Password" htmlFor="st-password" hint="At least 10 characters.">
            <Input id="st-password" name="password" type="password" minLength={10} required autoComplete="new-password" />
          </Field>
          <Field
            label="Age"
            htmlFor="st-age"
            error={under13 ? "You need to be 13 or over. Ask a parent to create an account and add you." : undefined}
          >
            <Input
              id="st-age"
              name="ageYears"
              type="number"
              inputMode="numeric"
              min={13}
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="!w-32"
              aria-invalid={under13 || undefined}
            />
          </Field>
          <div className="space-y-3">
            <Checkbox
              name="parentAware"
              label={
                <>
                  A parent or carer knows I am signing up
                  <span className={needsParent ? "font-semibold text-neutral-900" : "text-neutral-600"}> (required if you are 13–15)</span>
                </>
              }
            />
            <Checkbox
              name="acceptTerms"
              required
              label={
                <>
                  I accept the{" "}
                  <Link className="font-medium text-brand-navy underline" href="/legal/terms">
                    terms
                  </Link>
                </>
              }
            />
          </div>
          <div aria-live="polite">
            {error && (
              <Callout tone="danger" title="We couldn't create your account">
                {error}
              </Callout>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Create account
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
