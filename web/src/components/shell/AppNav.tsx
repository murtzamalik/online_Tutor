"use client";

import { useInShell } from "./AppShell";
import { PublicHeader } from "./PublicHeader";

/**
 * Shell-03 — kept for existing screens. Inside an AppShell (all signed-in route groups) the shell
 * already renders navigation, so this renders nothing; elsewhere it renders the public header.
 */
export function AppNav(_props: { displayName?: string; roles?: string[]; kind?: string | null }) {
  const inShell = useInShell();
  if (inShell) return null;
  return <PublicHeader />;
}
