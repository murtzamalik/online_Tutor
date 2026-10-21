import { AppShell } from "@/components/shell/AppShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell area="staff" loginPath="/staff/login">{children}</AppShell>;
}
