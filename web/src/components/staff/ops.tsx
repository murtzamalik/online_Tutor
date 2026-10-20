"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, SchemaParseError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Badge, Callout, Card, CardBody, type Tone } from "@/components/ui/primitives";
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from "@/components/ui/states";
import { cx } from "@/components/ui/cx";
import { useSession } from "@/components/shell/session";
import { humanise, toneFor } from "./format";

/* ------------------------------------------------------------------ errors */

export type Problem = { status: number | null; forbidden: boolean; message: string };

/** Normalises anything thrown by apiFetch into a user-facing problem. */
export function toProblem(err: unknown, fallback = "Something went wrong. Try again."): Problem {
  if (err instanceof ApiError) {
    if (err.status === 403) return { status: 403, forbidden: true, message: err.message || "You do not have access." };
    if (err.status === 401) return { status: 401, forbidden: false, message: "Your session has ended. Sign in again to continue." };
    if (err.status === 404) return { status: 404, forbidden: false, message: err.message || "We could not find that record." };
    return { status: err.status, forbidden: false, message: err.message || fallback };
  }
  if (err instanceof SchemaParseError) {
    return { status: null, forbidden: false, message: "The server sent a response we could not read. Refresh and try again." };
  }
  if (err instanceof Error && err.message === "Not signed in") {
    return { status: 401, forbidden: false, message: "You are not signed in. Sign in again to continue." };
  }
  if (err instanceof Error && err.message) return { status: null, forbidden: false, message: err.message };
  return { status: null, forbidden: false, message: fallback };
}

/** Short message for an action failure (forbidden actions get a clear role hint). */
export function actionError(err: unknown, fallback: string): string {
  const p = toProblem(err, fallback);
  if (p.forbidden) return `${p.message} Your role cannot do this action.`;
  return p.message;
}

/* ------------------------------------------------------------------ data hook */

export type ApiState<T> = {
  data: T | null;
  problem: Problem | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (d: T | null) => void;
};

/**
 * Loads data on mount (and whenever `key` changes). `enabled: false` waits (e.g. until the session token is ready).
 * Keeps the last good data visible while reloading.
 */
export function useApi<T>(load: () => Promise<T>, opts: { key?: unknown; enabled?: boolean } = {}): ApiState<T> {
  const { key, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await loadRef.current();
      if (!mounted.current) return;
      setData(d);
      setProblem(null);
    } catch (err) {
      if (!mounted.current) return;
      setProblem(toProblem(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [reload, enabled, key]);

  return { data, problem, loading, reload, setData };
}

/** Wraps an async action with a busy flag. */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, run };
}

/**
 * Access token for API helpers that take an explicit token (lib/api/w3). Uses the shell session
 * (session or local storage) so pages work for "remember me" sign-ins too.
 */
export function useAccessToken(): { token: string | undefined; ready: boolean } {
  const session = useSession();
  if (!session) {
    // Outside the AppShell: fall back to storage directly.
    const t =
      typeof window !== "undefined"
        ? sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken") ?? undefined
        : undefined;
    return { token: t, ready: typeof window !== "undefined" };
  }
  if (session.status === "loading") return { token: undefined, ready: false };
  return { token: session.token, ready: true };
}

/* ------------------------------------------------------------------ state gate */

/**
 * Renders loading / forbidden / error / empty for a data view, otherwise its children.
 * Last good data stays visible during a reload; an error after data loaded shows as an inline callout.
 */
export function DataState<T>({
  state,
  isEmpty,
  emptyTitle = "Nothing here yet",
  emptyBody = "There is nothing to show.",
  emptyAction,
  forbiddenBody,
  errorTitle = "Could not load this page",
  loadingLabel,
  lines,
  children,
}: {
  state: Pick<ApiState<T>, "data" | "problem" | "loading" | "reload">;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  forbiddenBody: string;
  errorTitle?: string;
  loadingLabel?: string;
  lines?: number;
  children: (data: T) => ReactNode;
}) {
  const { data, problem, loading, reload } = state;
  if (problem?.forbidden) return <ForbiddenState body={forbiddenBody} />;
  if (data === null) {
    if (problem) {
      return (
        <ErrorState
          title={errorTitle}
          body={problem.message}
          action={
            <Button variant="secondary" size="sm" onClick={() => void reload()} loading={loading}>
              Try again
            </Button>
          }
        />
      );
    }
    return <LoadingState label={loadingLabel} lines={lines} />;
  }
  return (
    <>
      {problem && (
        <Callout tone="danger" title="Could not refresh" className="mb-4">
          {problem.message}
        </Callout>
      )}
      {isEmpty?.(data) ? <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} /> : children(data)}
    </>
  );
}

/* ------------------------------------------------------------------ presentational bits */

export function StatusBadge({ status, tone, label }: { status: unknown; tone?: Tone; label?: string }) {
  return <Badge tone={tone ?? toneFor(status)}>{label ?? humanise(status)}</Badge>;
}

/** Queue on the left (or top on small screens), detail panel on the right. */
export function QueueLayout({ list, detail, className }: { list: ReactNode; detail: ReactNode; className?: string }) {
  return (
    <div className={cx("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]", className)}>
      <div className="min-w-0">{list}</div>
      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start" aria-label="Selected item">
        {detail}
      </aside>
    </div>
  );
}

export function DetailPlaceholder({ title = "Nothing selected", body }: { title?: string; body: string }) {
  return (
    <Card className="border-dashed">
      <CardBody className="py-10 text-center">
        <p className="font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-[14px] text-neutral-600">{body}</p>
      </CardBody>
    </Card>
  );
}

/** Clickable, keyboard-accessible table row for queue selection. */
export function SelectableRow({
  selected,
  onSelect,
  label,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cx(
        "cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-navy/30",
        selected ? "bg-brand-navySoft" : "hover:bg-neutral-050",
      )}
    >
      {children}
    </tr>
  );
}

export type Note = { tone: Tone; text: string } | null;

/** Inline async result / error message. */
export function ResultNote({ note, onDismiss, className }: { note: Note; onDismiss?: () => void; className?: string }) {
  return (
    <div aria-live="polite" className={className}>
      {note && (
        <Callout tone={note.tone}>
          <div className="flex items-start justify-between gap-3">
            <span>{note.text}</span>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 text-caption font-semibold underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </Callout>
      )}
    </div>
  );
}

/** Thin horizontal meter (value 0–1). */
export function Meter({ value, tone = "brand", label }: { value: number; tone?: "brand" | "teal" | "success" | "warning" | "danger"; label: string }) {
  const p = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const fill: Record<string, string> = {
    brand: "bg-brand-navy",
    teal: "bg-brand-teal",
    success: "bg-answer-correct",
    warning: "bg-answer-partial",
    danger: "bg-answer-incorrect",
  };
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <div className={cx("h-full rounded-full", fill[tone])} style={{ width: `${p * 100}%` }} />
    </div>
  );
}

/** Row of KPI tiles. */
export function StatRow({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const c: Record<number, string> = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-3 lg:grid-cols-5",
  };
  return <div className={cx("mb-6 grid grid-cols-2 gap-3", c[cols])}>{children}</div>;
}

/** Filter bar above a table. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mb-4 flex flex-wrap items-end gap-3", className)}>{children}</div>;
}

/** Section heading inside a page (below the PageHeader). */
export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-h2 text-neutral-900">{title}</h2>
        {description && <p className="mt-0.5 text-caption text-neutral-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
