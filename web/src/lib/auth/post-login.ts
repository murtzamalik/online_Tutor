import { homeFor, roleOf } from "@/components/shell/nav";

/** Resolve post-login destination from /me roles (or account kind).
 * Callers: login/page.tsx, staff/login/page.tsx, child-login/page.tsx.
 * Uses the same role mapping as the app shell, so teachers land on the school console and every
 * staff role (incl. CONTENT_ADMIN) lands on its own first tool.
 */
export function homePathForRoles(roles: string[], kind?: string | null): string {
  return homeFor(roleOf(roles, kind));
}

/** Where to go after signing in: the `?next=` page the user was sent away from (same-origin paths only), else their home. */
export function destinationAfterLogin(roles: string[], kind?: string | null): string {
  if (typeof window !== "undefined") {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  }
  return homePathForRoles(roles, kind);
}
