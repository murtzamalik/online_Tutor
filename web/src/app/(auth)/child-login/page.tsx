"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowCounterClockwise, Backspace } from "@phosphor-icons/react";
import { picturePinLogin } from "@/lib/api/auth-extra";
import { getMe } from "@/lib/api/auth";
import { destinationAfterLogin } from "@/lib/auth/post-login";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { AuthCard } from "@/components/shell/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Callout, Field, Input } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";
import { PICTURES, pictureOf } from "@/components/auth/pictures";



const MAX = 6;
const MIN = 3;


/** B-11 — Child picture-PIN login */
export default function ChildLoginPage() {
  const [loginHandle, setLoginHandle] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  function togglePic(key: string) {
    setSequence((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key].slice(0, MAX)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const tokens = await picturePinLogin(loginHandle, sequence);
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
        setMessage(err.message);
      } else if (err instanceof SchemaParseError) {
        setMessage("Login response could not be read. Try again or contact support.");
      } else {
        setMessage("Login failed.");
      }
    }
  }

  const remaining = Math.max(0, MIN - sequence.length);

  return (
    <AuthCard
      audience="student"
      title="Hi there! Let’s log you in"
      description="Type your login name, then tap your secret pictures in the right order."
      footer={
        <p>
          Grown-up?{" "}
          <Link href="/login" className="font-semibold text-brand-navy hover:underline">
            Parent login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="animate-rise space-y-6">
        <Field label="Your login name" htmlFor="child-handle" hint="Your parent or teacher can tell you this.">
          <Input
            id="child-handle"
            className="h-12 !text-[17px]"
            required
            value={loginHandle}
            onChange={(e) => setLoginHandle(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Field>

        <fieldset>
          <legend className="text-[14px] font-semibold text-neutral-700">Your secret pictures</legend>

          {/* Selected order */}
          <div className="mt-2 flex min-h-[56px] flex-wrap items-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-050 p-2" aria-live="polite">
            {sequence.length === 0 ? (
              <p className="px-2 text-[14px] text-neutral-600">Tap at least {MIN} pictures below.</p>
            ) : (
              sequence.map((key, i) => {
                const pic = pictureOf(key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-white py-1 pl-1 pr-3 text-[14px] font-semibold text-neutral-900 shadow-soft"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-[12px] text-white tabular">{i + 1}</span>
                    <span aria-hidden className="text-[18px] leading-none">{pic?.emoji}</span>
                    {pic?.label ?? key}
                  </span>
                );
              })
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-caption text-neutral-600">
            <span>
              {sequence.length} of up to {MAX} chosen
              {remaining > 0 && sequence.length > 0 ? ` · ${remaining} more to go` : ""}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => setSequence((prev) => prev.slice(0, -1))}
                disabled={sequence.length === 0}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-brand-navy hover:bg-neutral-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
              >
                <Backspace size={16} aria-hidden /> Undo
              </button>
              <button
                type="button"
                onClick={() => setSequence([])}
                disabled={sequence.length === 0}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-brand-navy hover:bg-neutral-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30"
              >
                <ArrowCounterClockwise size={16} aria-hidden /> Clear
              </button>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4" role="group" aria-label="Picture choices">
            {PICTURES.map((p) => {
              const selected = sequence.includes(p.key);
              const order = sequence.indexOf(p.key) + 1;
              const full = !selected && sequence.length >= MAX;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => togglePic(p.key)}
                  disabled={full}
                  aria-pressed={selected}
                  aria-label={selected ? `${p.label}, picture ${order}` : p.label}
                  className={cx(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white transition-all duration-fast",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-navy/25",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    selected
                      ? "border-brand-navy bg-brand-navySoft shadow-raised"
                      : "border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-soft active:translate-y-0",
                  )}
                >
                  <span aria-hidden className="text-[36px] leading-none sm:text-[40px]">{p.emoji}</span>
                  <span className="text-[13px] font-semibold text-neutral-700">{p.label}</span>
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-[13px] font-bold text-white shadow-soft tabular"
                    >
                      {order}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div aria-live="polite">
          {status === "error" && (
            <Callout tone="danger" title="That didn't work">
              {message} Check your login name and try your pictures again.
            </Callout>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={sequence.length < MIN} loading={status === "loading"}>
          {sequence.length < MIN ? `Choose ${remaining} more ${remaining === 1 ? "picture" : "pictures"}` : "Let’s go"}
        </Button>
      </form>
    </AuthCard>
  );
}
