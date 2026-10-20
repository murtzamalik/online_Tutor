"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/Button";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/gcse/chemistry", label: "GCSE Chemistry" },
  { href: "/pricing", label: "Pricing" },
  { href: "/try", label: "Try a question" },
  { href: "/case-studies", label: "Schools" },
  { href: "/faq", label: "FAQ" },
];

/** Marketing / public header (Tier 2 core navy). */
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Study Loop home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[14px] font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/login" className={buttonClass("tertiary", "sm")}>Log in</Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>Start free trial</Link>
        </div>
        <button className="ml-auto rounded-md p-2 text-neutral-700 hover:bg-neutral-100 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </div>
      {open && (
        <nav aria-label="Main" className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-neutral-700 hover:bg-neutral-100">
              {l.label}
            </Link>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/login" className={buttonClass("secondary", "md")}>Log in</Link>
            <Link href="/signup" className={buttonClass("primary", "md")}>Start free trial</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
