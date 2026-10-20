import { cx } from "@/components/ui/cx";

/** Study Loop wordmark: a looped "S" mark in brand navy + teal. */
export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill={inverted ? "#FFFFFF" : "#1F3864"} />
        <path
          d="M18.5 9.2c-1-.9-2.4-1.4-4-1.4-2.6 0-4.4 1.4-4.4 3.4 0 4.3 8.3 2.6 8.3 6.3 0 1.9-1.8 3.2-4.4 3.2-1.8 0-3.4-.6-4.5-1.7"
          fill="none"
          stroke={inverted ? "#1F3864" : "#FFFFFF"}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="19.6" cy="19.2" r="1.9" fill="#3CB98F" />
      </svg>
      {!compact && (
        <span className={cx("text-[17px] font-bold tracking-tight", inverted ? "text-white" : "text-brand-navy")}>
          Study Loop
        </span>
      )}
    </span>
  );
}
