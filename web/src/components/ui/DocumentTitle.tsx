"use client";

import { usePageTitle } from "@/lib/usePageTitle";

/** Renders nothing; keeps the browser tab title in sync (lets server-safe components set it). */
export function DocumentTitle({ title }: { title?: string | null }) {
  usePageTitle(title);
  return null;
}
