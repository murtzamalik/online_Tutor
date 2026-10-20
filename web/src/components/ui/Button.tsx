import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/**
 * Design System §7.1. Primary = the single next action on a screen; secondary = alternative;
 * tertiary = low-emphasis text action; destructive = irreversible only (never answer-related).
 * "ghost" is kept as an alias of secondary for existing screens.
 */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-fast " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--tier-accent)] text-white shadow-soft hover:brightness-110 active:brightness-95",
  secondary:
    "border-[1.5px] border-[var(--tier-accent)] bg-white text-[var(--tier-accent)] hover:bg-brand-navySoft",
  ghost: "border-[1.5px] border-[var(--tier-accent)] bg-white text-[var(--tier-accent)] hover:bg-brand-navySoft",
  tertiary: "text-[var(--tier-accent)] hover:bg-neutral-100",
  destructive: "bg-answer-incorrect text-white shadow-soft hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function ButtonLink({ href, variant = "primary", size = "md", icon, className, children, ...props }: LinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
