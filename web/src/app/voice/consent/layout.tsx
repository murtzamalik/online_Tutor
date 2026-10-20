import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

/** Voice consent (J-06) is granted by a parent, so it renders inside the signed-in shell with parent login. */
export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell loginPath="/login">{children}</AppShell>;
}
