"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CaretLeft } from "@phosphor-icons/react";
import { useSession } from "@/components/shell/session";
import { PageHeader } from "@/components/ui/primitives";
import { cx } from "@/components/ui/cx";

export type ChildTab =
  | "overview"
  | "reports"
  | "misconceptions"
  | "predicted"
  | "target"
  | "alerts"
  | "controls"
  | "privacy"
  | "consent";

const TABS: Array<{ key: ChildTab; label: string; path: string }> = [
  { key: "overview", label: "Overview", path: "" },
  { key: "reports", label: "Reports", path: "#reports" },
  { key: "misconceptions", label: "Misconceptions", path: "/misconceptions" },
  { key: "predicted", label: "Predicted grade", path: "/predicted" },
  { key: "target", label: "Target", path: "/target" },
  { key: "alerts", label: "Alerts", path: "/alerts" },
  { key: "controls", label: "AI controls", path: "/controls" },
  { key: "privacy", label: "Privacy", path: "/privacy" },
  { key: "consent", label: "Consent", path: "/consent" },
];

/** The child's name from the signed-in parent's session (GET /me children). */
export function useChildName(studentId: string): string | undefined {
  const session = useSession();
  const child = session?.children.find((c) => String(c.studentId ?? "") === studentId);
  const name = child?.displayName;
  return typeof name === "string" && name ? name : undefined;
}

export function useChildYear(studentId: string): string | undefined {
  const session = useSession();
  const child = session?.children.find((c) => String(c.studentId ?? "") === studentId);
  const y = child?.yearGroup;
  return typeof y === "string" && y ? y : undefined;
}

/** Child detail header: back link, child name + section title, and the section link row. */
export function ChildHeader({
  studentId,
  active,
  title,
  description,
  actions,
  onTabClick,
}: {
  studentId: string;
  active: ChildTab;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Called when a section link is clicked (lets same-page tabs like Overview/Reports update the active state). */
  onTabClick?: (key: ChildTab) => void;
}) {
  const name = useChildName(studentId);
  const year = useChildYear(studentId);
  const base = `/parent/children/${studentId}`;
  const section = TABS.find((t) => t.key === active)?.label ?? title;
  return (
    <div className="mb-6 print:hidden">
      <Link
        href="/parent"
        className="mb-3 inline-flex items-center gap-1 text-caption font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <CaretLeft size={14} aria-hidden /> All children
      </Link>
      <PageHeader
        className="mb-4"
        eyebrow={[name ?? "Your child", year].filter(Boolean).join(" · ")}
        title={title}
        docTitle={`${name ?? "Your child"} · ${section}`}
        description={description}
        actions={actions}
      />
      <nav aria-label="Child sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-neutral-200">
          {TABS.map((t) => {
            const on = t.key === active;
            return (
              <li key={t.key}>
                <Link
                  href={`${base}${t.path}`}
                  aria-current={on ? "page" : undefined}
                  onClick={onTabClick ? () => onTabClick(t.key) : undefined}
                  className={cx(
                    "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-[14px] font-medium transition-colors duration-fast",
                    on
                      ? "border-brand-navy text-brand-navy"
                      : "border-transparent text-neutral-600 hover:border-neutral-200 hover:text-neutral-900",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
