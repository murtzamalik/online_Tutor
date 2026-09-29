import Link from "next/link";

export default function MarketingHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="font-display text-5xl text-ink md:text-7xl">Study Loop</p>
      <p className="mt-4 max-w-xl text-lg text-ink/75">
        Adaptive practice and instant marking for UK exams — built privacy-first for families and schools.
      </p>
      <div className="mt-8 flex gap-3">
        <Link className="rounded-md bg-accent px-5 py-3 font-semibold text-white" href="/login">
          Log in
        </Link>
        <Link className="rounded-md border border-mist bg-white/70 px-5 py-3 font-semibold" href="/staff/login">
          Staff login
        </Link>
      </div>
    </main>
  );
}
