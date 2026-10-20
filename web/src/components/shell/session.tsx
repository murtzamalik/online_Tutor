"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, logout } from "@/lib/api/auth";
import { roleOf, type Role } from "./nav";

export type Session = {
  status: "loading" | "anonymous" | "ready";
  token?: string;
  displayName?: string;
  email?: string | null;
  roles: string[];
  kind?: string;
  role: Role;
  studentId?: string | null;
  schoolId?: string | null;
  children: Array<Record<string, unknown>>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session | null {
  return useContext(SessionContext);
}

function readToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken") ?? undefined;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading", roles: [], role: "guest", children: [] });

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setSession({ status: "anonymous", roles: [], role: "guest", children: [] });
      return;
    }
    getMe(token)
      .then((me) =>
        setSession({
          status: "ready",
          token,
          displayName: me.displayName,
          email: me.email,
          roles: me.roles,
          kind: me.kind,
          role: roleOf(me.roles, me.kind),
          studentId: me.studentId,
          schoolId: me.schoolId,
          children: me.children,
        }),
      )
      .catch(() => setSession({ status: "anonymous", roles: [], role: "guest", children: [] }));
  }, []);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export async function signOut(): Promise<void> {
  const refresh = sessionStorage.getItem("refreshToken") ?? undefined;
  try {
    await logout(refresh);
  } catch {
    // The local session is cleared regardless.
  }
  for (const key of ["accessToken", "refreshToken", "studentId", "childId"]) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}
