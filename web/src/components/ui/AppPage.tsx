import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Standard content container inside the AppShell.
 * width: "content" (720px, reading/question screens, §6.2), "wide" (1080px, dashboards/tables), "full".
 */
export function AppPage({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "content" | "wide" | "full";
  className?: string;
}) {
  return (
    <main
      className={cx(
        "mx-auto px-4 py-8 sm:px-6 lg:py-10",
        width === "content" && "max-w-content",
        width === "wide" && "max-w-[1080px]",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Public/marketing content container (inside PublicFrame). */
export function PublicPage({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx("mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16", className)}>{children}</main>;
}
