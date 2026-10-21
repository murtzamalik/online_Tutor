"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Bell, List, SignOut, X, CaretDown } from "@phosphor-icons/react";
import { cx } from "@/components/ui/cx";
import { Logo } from "./Logo";
import { homeFor, isActive, navFor, pageAllowed, type NavSection, type Role } from "./nav";
import { ForbiddenState } from "@/components/ui/states";
import { SessionProvider, signOut, useSession } from "./session";
import { getAccessibility } from "@/lib/api/w4";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";

/** True inside an AppShell, so legacy per-page <AppNav/> renders nothing. */
export const InShellContext = createContext(false);
export const useInShell = () => useContext(InShellContext);

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  parent: "Parent",
  school: "School",
  staff: "Staff",
  guest: "",
};

export function AppShell({ children, loginPath = "/login", area }: { children: ReactNode; loginPath?: string; area?: Role }) {
  return (
    <SessionProvider>
      <ShellFrame loginPath={loginPath} area={area}>{children}</ShellFrame>
    </SessionProvider>
  );
}

function ShellFrame({ children, loginPath, area }: { children: ReactNode; loginPath: string; area?: Role }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (session?.status === "anonymous") {
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
    }
  }, [session?.status, router, loginPath, pathname]);

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    const onExpired = () => {
      for (const key of ["accessToken", "refreshToken"]) sessionStorage.removeItem(key);
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router, loginPath, pathname]);

  // Apply the learner's saved accessibility preferences on every student page, not only in settings.
  const studentId = session?.role === "student" ? session.studentId : null;
  useEffect(() => {
    if (!studentId) return;
    getAccessibility(studentId)
      .then((r: unknown) => {
        const raw = (r as { accessibilityJson?: unknown })?.accessibilityJson;
        let prefs: Record<string, unknown> = {};
        try {
          prefs = (typeof raw === "string" ? JSON.parse(raw) : raw ?? {}) as Record<string, unknown>;
        } catch {
          prefs = {};
        }
        const root = document.documentElement;
        root.style.setProperty("--a11y-text-scale", String(prefs.textScale ?? 1));
        root.dataset.dyslexia = prefs.dyslexiaFont ? "1" : "0";
        root.dataset.contrast = prefs.highContrast ? "high" : "default";
        root.dataset.motion = prefs.reduceMotion ? "reduce" : "ok";
      })
      .catch(() => {
        /* defaults stay in place */
      });
  }, [studentId]);

  const role = session?.role ?? "guest";
  const sections = navFor(role, session?.roles);
  const student = role === "student";

  return (
    <InShellContext.Provider value>
      <div className="min-h-screen bg-paper" data-tier={student ? "core" : "professional"}>
        {/* Desktop sidebar */}
        <aside
          className={cx(
            "fixed inset-y-0 left-0 z-30 hidden w-60 flex-col lg:flex",
            student ? "bg-brand-navy text-white" : "border-r border-neutral-200 bg-white",
          )}
        >
          <SidebarContent sections={sections} role={role} pathname={pathname} dark={student} />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button className="absolute inset-0 bg-neutral-900/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
            <aside className={cx("relative flex h-full w-72 flex-col shadow-overlay", student ? "bg-brand-navy text-white" : "bg-white")}>
              <button
                className={cx("absolute right-3 top-3 rounded-md p-2", student ? "text-white/80 hover:bg-white/10" : "text-neutral-600 hover:bg-neutral-100")}
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <SidebarContent sections={sections} role={role} pathname={pathname} dark={student} />
            </aside>
          </div>
        )}

        <div className="lg:pl-60">
          <TopBar
            onMenu={() => setDrawer(true)}
            name={session?.displayName}
            role={role}
            loading={session?.status === "loading"}
            onSignOut={async () => {
              await signOut();
              router.replace(role === "staff" ? "/staff/login" : role === "student" ? "/child-login" : "/login");
            }}
          />
          <div className={cx("sl-content pb-24 lg:pb-12", session?.status !== "ready" && "opacity-0")}>
            {session?.status !== "ready" ? null : area === "school" && role === "school" && !session.schoolId ? (
              <div className="mx-auto max-w-xl px-4 py-12">
                <ForbiddenState body="Your account is not linked to a school yet. Ask your school admin to add you." />
              </div>
            ) : area && !pageAllowed(area, role, pathname, session.roles) ? (
              <div className="mx-auto max-w-xl px-4 py-12">
                <ForbiddenState body="This page is not part of your account. Use the menu to go to the pages you can open." />
                <p className="mt-4 text-center">
                  <Link href={homeFor(role)} className="font-semibold text-brand-navy underline">
                    Go to your home
                  </Link>
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>

        {student && <BottomTabs sections={sections} pathname={pathname} />}
      </div>
    </InShellContext.Provider>
  );
}

function SidebarContent({
  sections,
  role,
  pathname,
  dark,
}: {
  sections: NavSection[];
  role: Role;
  pathname: string;
  dark: boolean;
}) {
  return (
    <>
      <div className="flex h-16 items-center px-5">
        <Link href={homeFor(role)} className="flex items-center gap-2.5" aria-label="Study Loop home">
          <Logo inverted={dark} />
        </Link>
        {role !== "student" && role !== "guest" && (
          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
            {ROLE_LABEL[role]}
          </span>
        )}
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
        {sections.map((sec, i) => (
          <div key={i} className={cx(i > 0 && "mt-6")}>
            {sec.title && (
              <p className={cx("mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-white/50" : "text-neutral-400")}>
                {sec.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-fast",
                        dark
                          ? active
                            ? "bg-white/15 text-white"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                          : active
                            ? "bg-brand-navySoft text-brand-navy"
                            : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
                      )}
                    >
                      <Icon size={19} weight={active ? "fill" : "regular"} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

function TopBar({
  onMenu,
  name,
  role,
  loading,
  onSignOut,
}: {
  onMenu: () => void;
  name?: string;
  role: Role;
  loading: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <List size={22} />
      </button>
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <div className="ml-auto flex items-center gap-1">
        {role !== "student" && (
          <Link href="/notifications" className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100" aria-label="Notifications">
            <Bell size={20} />
          </Link>
        )}
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-neutral-100"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-[13px] font-semibold text-white">
              {loading ? "" : initials || "?"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-[14px] font-semibold leading-tight text-neutral-900">{name ?? " "}</span>
              <span className="block text-[12px] leading-tight text-neutral-600">{ROLE_LABEL[role]}</span>
            </span>
            <CaretDown size={14} className="text-neutral-400" />
          </button>
          {open && (
            <div role="menu" className="absolute right-0 mt-2 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-overlay">
              <button
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] text-neutral-700 hover:bg-neutral-100"
                onClick={onSignOut}
              >
                <SignOut size={18} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomTabs({ sections, pathname }: { sections: NavSection[]; pathname: string }) {
  const items = sections.flatMap((s) => s.items).filter((i) => ["/home", "/practice", "/revise", "/tutor", "/student/map"].includes(i.href));
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-white lg:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-navy" : "text-neutral-600")}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
