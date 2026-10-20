"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { postCookieConsent } from "@/lib/api/marketing";
import { Logo } from "./Logo";
import { PublicHeader } from "./PublicHeader";

/** Public/marketing page frame: header, footer and the cookie consent banner (CON-06). */
export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
      <CookieBanner />
    </div>
  );
}

export function PublicFooter() {
  const cols: Array<[string, Array<[string, string]>]> = [
    ["Product", [["GCSE Chemistry", "/gcse/chemistry"], ["Pricing", "/pricing"], ["Try a question", "/try"], ["Which plan?", "/plan-quiz"]]],
    ["Resources", [["Free resources", "/library"], ["Exam dates", "/exam-dates"], ["Results", "/results"], ["FAQ", "/faq"]]],
    ["Company", [["For schools", "/case-studies"], ["Help centre", "/help"], ["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"]]],
  ];
  return (
    <footer className="border-t border-neutral-200 bg-neutral-050">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[14px] text-neutral-600">
            Exam-board-accurate practice, instant marking and a tutor that helps you think — privacy-first for families and schools.
          </p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="text-caption font-semibold uppercase tracking-wide text-neutral-900">{title}</p>
            <ul className="mt-3 space-y-2">
              {links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-[14px] text-neutral-600 hover:text-brand-navy">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-200">
        <p className="mx-auto max-w-6xl px-4 py-5 text-caption text-neutral-600 sm:px-6">
          © {new Date().getFullYear()} Study Loop. Built for UK learners aged 11–18 under the ICO Children’s Code.
        </p>
      </div>
    </footer>
  );
}

const CONSENT_KEY = "cookieConsent";

/** Shown until the visitor chooses; essential-only is the default (AADC privacy-by-default). */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(CONSENT_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  async function choose(analytics: boolean) {
    setBusy(true);
    try {
      const res = await postCookieConsent({ essential: true, analytics });
      localStorage.setItem("visitorId", res.visitorId);
    } catch {
      // Remember the choice locally even if the API is unreachable; essential-only needs no server state.
    }
    try {
      localStorage.setItem(CONSENT_KEY, analytics ? "all" : "essential");
    } catch {
      /* storage blocked */
    }
    setBusy(false);
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-overlay sm:left-auto sm:right-6 sm:mx-0">
      <p className="text-[15px] font-semibold text-neutral-900">Cookies on Study Loop</p>
      <p className="mt-1 text-[14px] text-neutral-600">
        We only use essential cookies unless you allow analytics. Learner areas never use tracking cookies.{" "}
        <Link className="font-medium text-brand-navy underline" href="/legal/cookies">Cookie policy</Link>
      </p>
      <div className="mt-4 flex gap-2">
        <button className={buttonClass("primary", "sm")} disabled={busy} onClick={() => choose(false)}>Essential only</button>
        <button className={buttonClass("secondary", "sm")} disabled={busy} onClick={() => choose(true)}>Allow analytics</button>
      </div>
    </div>
  );
}
