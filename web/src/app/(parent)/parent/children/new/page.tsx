"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CaretLeft, Check } from "@phosphor-icons/react";
import { createStudent, setPicturePin } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { AppPage } from "@/components/ui/AppPage";
import { Button } from "@/components/ui/Button";
import { Callout, Card, CardBody, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { PICTURES } from "@/components/auth/pictures";

const YEARS = ["Y7", "Y8", "Y9", "Y10", "Y11"];

/** B-02 — Add child + picture PIN + under-13 consent when needed */
export default function NewChildPage() {
  const [displayName, setDisplayName] = useState("");
  const [yearGroup, setYearGroup] = useState("Y9");
  const [birthMonth, setBirthMonth] = useState("2014-01-01");
  const [sequence, setSequence] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");
  const [loginHandle, setLoginHandle] = useState<string | null>(null);

  function togglePic(key: string) {
    setSequence((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key].slice(0, 6)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const created = await createStudent({ displayName, yearGroup, birthMonth });
      let handle: string | null = null;
      if (sequence.length >= 3) {
        const pin = await setPicturePin(created.studentId, sequence);
        handle = pin.loginHandle;
        setLoginHandle(pin.loginHandle);
      }
      setStatus("ok");
      setMessage(
        handle
          ? `Child created. Login handle: ${handle}. Next: enrol on a subject track.`
          : "Child created. Next: enrol on a subject track.",
      );
      // Under-13s need the parent's explicit agreement first (UK GDPR); the consent page then leads on to subjects.
      window.location.href = created.requiresUnder13Consent
        ? `/parent/children/${created.studentId}/consent`
        : `/onboarding/subjects?studentId=${created.studentId}`;
      return;
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not create child.");
    }
  }

  const pinShort = sequence.length > 0 && sequence.length < 3;

  return (
    <AppPage width="content">
      <Link
        href="/parent"
        className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <CaretLeft size={14} aria-hidden /> Back to parent home
      </Link>
      <PageHeader
        title="Add a child"
        description="Creates a learner profile. You can also set a picture PIN so your child can sign in on their own."
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader title="About your child" description="Only a first name or nickname is needed." />
          <CardBody className="space-y-4">
            <Field label="Display name" htmlFor="child-name">
              <Input
                id="child-name"
                required
                autoComplete="off"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year group" htmlFor="child-year">
                <Select id="child-year" value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y.replace("Y", "Year ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Birth month" htmlFor="child-birth" hint="Use the first of the month. We use it for age-appropriate settings.">
                <Input
                  id="child-birth"
                  type="date"
                  required
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Picture PIN (optional)"
            description="Pick at least 3 pictures, in order. Your child taps the same pictures to sign in."
          />
          <CardBody>
            <fieldset>
              <legend className="sr-only">Picture PIN</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {PICTURES.map(({ key: p, emoji, label }) => {
                  const idx = sequence.indexOf(p);
                  const on = idx >= 0;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePic(p)}
                      aria-pressed={on}
                      className={cx(
                        "relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-md border text-caption font-medium transition-colors duration-fast",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
                        on
                          ? "border-brand-navy bg-brand-navySoft text-brand-navy"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-050",
                      )}
                    >
                      <span className="text-[24px] leading-none" aria-hidden>{emoji}</span>
                      {label}
                      {on && (
                        <span className="tabular absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[11px] font-semibold text-white">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-caption text-neutral-600" aria-live="polite">
                {sequence.length === 0
                  ? "No PIN selected — you can set one later."
                  : `Sequence: ${sequence.join(" → ")}`}
              </p>
              {pinShort && (
                <p className="mt-1 text-caption text-[#8A6508]">Pick at least 3 pictures, or clear them to skip the PIN.</p>
              )}
            </fieldset>
          </CardBody>
        </Card>

        <div aria-live="polite" className="space-y-3">
          {status === "error" && (
            <Callout tone="danger" title="We couldn't add your child">
              {message}
            </Callout>
          )}
          {status === "ok" && (
            <Callout tone="success" title="Child added">
              <span className="inline-flex items-center gap-1">
                <Check size={14} aria-hidden /> {message}
                {loginHandle && !message.includes(loginHandle) ? ` Login handle: ${loginHandle}` : ""}
              </span>
            </Callout>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={status === "loading"}>
            {status === "loading" ? "Saving…" : "Save child"}
          </Button>
          <Link href="/parent" className="text-[14px] font-semibold text-neutral-600 hover:text-neutral-900">
            Cancel
          </Link>
        </div>
      </form>
    </AppPage>
  );
}
