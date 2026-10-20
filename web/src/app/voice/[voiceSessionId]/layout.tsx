import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

/** Voice tutor sessions (J-01) are student screens: render inside the shell with the child login. */
export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell loginPath="/child-login">{children}</AppShell>;
}
