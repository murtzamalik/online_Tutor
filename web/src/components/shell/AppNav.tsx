import Link from "next/link";

const links = [
  { href: "/home", label: "Home" },
  { href: "/login", label: "Practice" },
  { href: "/login", label: "Revision" },
  { href: "/login", label: "Progress" },
  { href: "/login", label: "Voice Tutor" },
  { href: "/login", label: "Settings" },
];

/** Shell-03 — role-aware nav shell (W0: static links; gated by /me in later waves). */
export function AppNav({ displayName }: { displayName?: string }) {
  return (
    <header className="border-b border-mist/80 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/home" className="font-display text-2xl tracking-tight text-ink">
          Study Loop
        </Link>
        <nav aria-label="Primary" className="hidden gap-4 md:flex">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="text-sm font-semibold text-ink/80 hover:text-accent">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-ink/70">{displayName ?? "Guest"}</p>
      </div>
    </header>
  );
}
