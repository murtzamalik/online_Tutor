import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./Logo";

/**
 * Auth screens (login, sign-up, child login, verify, staff login): brand panel on the left (desktop),
 * focused form card on the right.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  audience = "family",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  audience?: "family" | "student" | "staff";
}) {
  const points =
    audience === "staff"
      ? ["Marking review and exception queues", "Content QC and past-paper ingestion", "Safeguarding and audit, MFA-protected"]
      : audience === "student"
        ? ["One question at a time", "Marks explained in mark-scheme language", "A tutor that helps you think"]
        : ["Exam-board-accurate practice and instant marking", "Clear progress for every child", "Privacy-first under the ICO Children’s Code"];
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
        <Link href="/" aria-label="Study Loop home">
          <Logo inverted />
        </Link>
        <div>
          <p className="text-[28px] font-bold leading-tight">
            {audience === "staff" ? "Study Loop operations" : audience === "student" ? "Ready when you are." : "Exam prep that explains every mark."}
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-white/85">
                <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-[#3CB98F]" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-caption text-white/60">UK-hosted · No third-party trackers in learner areas</p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-white/5" />
      </aside>
      <main className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[420px]">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="Study Loop home">
            <Logo />
          </Link>
          <h1 className="text-h1">{title}</h1>
          {description && <p className="mt-1.5 text-neutral-600">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-neutral-200 pt-6 text-[14px] text-neutral-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
