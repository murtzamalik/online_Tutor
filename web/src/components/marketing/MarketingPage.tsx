import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type Width = "wide" | "reading" | "narrow";

const widths: Record<Width, string> = {
  wide: "max-w-6xl",
  reading: "max-w-reading",
  narrow: "max-w-3xl",
};

/**
 * Public/marketing page body (used inside PublicFrame): a soft navy hero band with the page title,
 * then the content column. Same container rhythm as PublicPage and the homepage hero.
 */
export function MarketingPage({
  eyebrow,
  title,
  description,
  actions,
  aside,
  breadcrumb,
  width = "wide",
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional content on the right of the hero (desktop). */
  aside?: ReactNode;
  breadcrumb?: ReactNode;
  width?: Width;
  children: ReactNode;
}) {
  return (
    <main>
      <section className="border-b border-neutral-200 bg-gradient-to-b from-brand-navySoft/60 to-white">
        <div
          className={cx(
            "mx-auto px-4 py-12 sm:px-6 lg:py-16",
            widths[width],
            aside ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]" : undefined,
          )}
        >
          <div className="animate-rise min-w-0">
            {breadcrumb && <div className="mb-4 text-[14px]">{breadcrumb}</div>}
            {eyebrow && (
              <p className="text-caption font-semibold uppercase tracking-wider text-brand-teal">{eyebrow}</p>
            )}
            <h1 className="mt-2 text-[34px] font-bold leading-[1.12] tracking-tight text-neutral-900 sm:text-[42px]">
              {title}
            </h1>
            {description && <p className="mt-4 max-w-2xl text-body-lg text-neutral-600">{description}</p>}
            {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
          {aside && <div className="animate-rise min-w-0">{aside}</div>}
        </div>
      </section>
      <div className={cx("mx-auto px-4 py-12 sm:px-6 lg:py-16", widths[width])}>{children}</div>
    </main>
  );
}

/** Section heading used between blocks on marketing pages. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-teal">{eyebrow}</p>}
        <h2 className="text-h2 text-neutral-900">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-neutral-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Closing call-to-action band (navy card), as on the homepage schools block. */
export function CtaBand({
  title,
  body,
  actions,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-lg bg-brand-navy p-8 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-10",
        className,
      )}
    >
      <div className="relative max-w-xl">
        <h2 className="text-h1 text-white">{title}</h2>
        {body && <p className="mt-2 text-white/80">{body}</p>}
      </div>
      {actions && <div className="relative mt-6 flex flex-wrap gap-3 md:mt-0 md:shrink-0">{actions}</div>}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5" />
    </div>
  );
}

/** White button for use on the navy CtaBand (secondary buttons use the tier accent, which is navy). */
export const onNavyPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-[15px] font-semibold text-brand-navy shadow-soft transition-colors duration-fast hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy";
export const onNavySecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-white/70 px-5 text-[15px] font-semibold text-white transition-colors duration-fast hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy";
