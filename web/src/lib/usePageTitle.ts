"use client";

import { useEffect } from "react";

const APP_NAME = "Study Loop";

/** Sets document.title to "<title> · Study Loop" (or just "Study Loop" when empty). */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    const t = title?.trim();
    document.title = t ? `${t} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
