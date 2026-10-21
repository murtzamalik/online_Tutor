"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { PublicFrame } from "@/components/shell/PublicFrame";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";
import { homeFor, roleOf, type Role } from "@/components/shell/nav";
import { getMe } from "@/lib/api/auth";
import { usePageTitle } from "@/lib/usePageTitle";

const HOME_LABEL: Record<Role, string> = {
  student: "Go to Home",
  parent: "Go to parent home",
  school: "Go to school dashboard",
  staff: "Go to staff home",
  guest: "Go to homepage",
};

function readToken(): string | null {
  try {
    return sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken");
  } catch {
    return null;
  }
}

/** Global 404 — friendly page with a way back to the right home for signed-in users. */
export default function NotFound() {
  usePageTitle("Page not found");
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const token = readToken();
    if (!token) return;
    let cancelled = false;
    getMe(token)
      .then((me) => {
        if (!cancelled) setRole(roleOf(me.roles, me.kind));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = role !== null && role !== "guest";

  return (
    <PublicFrame>
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-navySoft text-brand-navy">
            <MagnifyingGlass size={24} aria-hidden />
          </span>
          <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-neutral-600">404</p>
          <h1 className="mt-1 text-h1 text-neutral-900">Page not found</h1>
          <p className="mt-2 text-neutral-600">
            We couldn&apos;t find that page. It may have moved, or the link may be mistyped.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {signedIn ? (
              <>
                <ButtonLink href={homeFor(role)}>{HOME_LABEL[role]}</ButtonLink>
                <ButtonLink href="/" variant="secondary">
                  Homepage
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/">{HOME_LABEL.guest}</ButtonLink>
                <ButtonLink href="/login" variant="secondary">
                  Log in
                </ButtonLink>
              </>
            )}
          </div>
        </Card>
      </main>
    </PublicFrame>
  );
}
