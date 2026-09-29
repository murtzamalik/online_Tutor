import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:brightness-110"
      : "bg-transparent text-ink border border-mist hover:bg-white/60";
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-semibold transition ${styles} ${className}`}
      {...props}
    />
  );
}
