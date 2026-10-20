"use client";

import Link from "next/link";
import { FileText, Lightning, Notebook } from "@phosphor-icons/react";
import { cx } from "@/components/ui/cx";

const TABS = [
  { key: "notes", label: "Notes", icon: Notebook, href: (id: string) => `/revise/notes/${id}` },
  { key: "cheat-sheet", label: "Cheat sheet", icon: FileText, href: (id: string) => `/revise/cheat-sheet/${id}` },
  { key: "check", label: "2-minute check", icon: Lightning, href: (id: string) => `/revise/check/${id}` },
] as const;

/** Switches between the revision views of one topic. */
export function TopicNav({ topicId, active }: { topicId: string; active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Revision views" className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1">
      {TABS.map((t) => {
        const on = t.key === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href(topicId)}
            aria-current={on ? "page" : undefined}
            className={cx(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[14px] font-semibold transition-colors duration-fast",
              on ? "bg-brand-navy text-white" : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            <Icon size={16} aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
